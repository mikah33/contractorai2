import Foundation
import ARKit
import RealityKit
import Metal
import MetalKit
import ModelIO
import SceneKit
import UIKit

// MARK: - Captured Photo with Pose

struct CapturedPhotoWithPose {
    let image: UIImage
    let transform: simd_float4x4  // Camera position/rotation in world space
    let intrinsics: simd_float3x3 // Camera intrinsics (focal length, principal point)
    let timestamp: TimeInterval
}

// MARK: - Texture Mapper

@available(iOS 16.0, *)
class TextureMapper {

    private let device: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let textureSize: Int = 2048  // Output texture resolution

    init?() {
        guard let device = MTLCreateSystemDefaultDevice(),
              let commandQueue = device.makeCommandQueue() else {
            print("Failed to create Metal device")
            return nil
        }
        self.device = device
        self.commandQueue = commandQueue
    }

    // MARK: - Main Processing Pipeline

    func createTexturedModel(
        meshURL: URL,
        photos: [CapturedPhotoWithPose],
        outputURL: URL,
        progress: @escaping (Float, String) -> Void,
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            do {
                progress(0.1, "Loading mesh...")

                // 1. Load the mesh from USDZ
                guard let meshData = self.loadMesh(from: meshURL) else {
                    throw TextureMapperError.meshLoadFailed
                }

                progress(0.2, "Analyzing surfaces...")

                // 2. Extract surfaces and generate UV coordinates
                let surfaces = self.extractSurfaces(from: meshData)

                progress(0.3, "Generating UV map...")

                // 3. Create UV mapping for the mesh
                let uvMappedMesh = self.generateUVMapping(surfaces: surfaces)

                progress(0.4, "Projecting textures...")

                // 4. Project photos onto surfaces
                let textureAtlas = self.projectPhotosToTexture(
                    photos: photos,
                    surfaces: uvMappedMesh,
                    progressCallback: { p in
                        progress(0.4 + p * 0.4, "Projecting textures...")
                    }
                )

                progress(0.8, "Blending seams...")

                // 5. Blend overlapping regions
                let blendedTexture = self.blendTextures(textureAtlas)

                progress(0.9, "Exporting model...")

                // 6. Create final textured USDZ
                try self.exportTexturedUSDZ(
                    mesh: uvMappedMesh,
                    texture: blendedTexture,
                    to: outputURL
                )

                progress(1.0, "Complete!")

                DispatchQueue.main.async {
                    completion(.success(outputURL))
                }

            } catch {
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
            }
        }
    }

    // MARK: - Mesh Loading

    private func loadMesh(from url: URL) -> MDLAsset? {
        let asset = MDLAsset(url: url)
        asset.loadTextures()
        return asset
    }

    // MARK: - Surface Extraction

    private struct Surface {
        var vertices: [SIMD3<Float>]
        var normals: [SIMD3<Float>]
        var indices: [UInt32]
        var uvCoordinates: [SIMD2<Float>]
        var type: SurfaceType
    }

    private enum SurfaceType {
        case wall
        case floor
        case ceiling
        case other
    }

    private func extractSurfaces(from asset: MDLAsset) -> [Surface] {
        var surfaces: [Surface] = []

        // Iterate through all meshes in the asset
        for object in asset.childObjects(of: MDLMesh.self) {
            guard let mesh = object as? MDLMesh else { continue }

            // Get vertex data
            guard let vertexBuffer = mesh.vertexBuffers.first else { continue }
            let vertexMap = vertexBuffer.map()
            let vertexData = vertexMap.bytes

            let vertexCount = mesh.vertexCount
            let vertexDescriptor = mesh.vertexDescriptor

            // Extract positions and normals
            var vertices: [SIMD3<Float>] = []
            var normals: [SIMD3<Float>] = []

            // Find position and normal attributes
            guard let positionAttr = vertexDescriptor.attributes[0] as? MDLVertexAttribute,
                  let layout = vertexDescriptor.layouts[0] as? MDLVertexBufferLayout else { continue }
            let normalAttr = vertexDescriptor.attributeNamed(MDLVertexAttributeNormal)

            let stride = layout.stride

            for i in 0..<vertexCount {
                let offset = i * stride

                // Position
                let posPtr = vertexData.advanced(by: offset + positionAttr.offset)
                    .assumingMemoryBound(to: Float.self)
                vertices.append(SIMD3<Float>(posPtr[0], posPtr[1], posPtr[2]))

                // Normal (if available)
                if let normalAttr = normalAttr {
                    let normPtr = vertexData.advanced(by: offset + normalAttr.offset)
                        .assumingMemoryBound(to: Float.self)
                    normals.append(SIMD3<Float>(normPtr[0], normPtr[1], normPtr[2]))
                } else {
                    normals.append(SIMD3<Float>(0, 1, 0))
                }
            }

            // Extract indices from submeshes
            for submesh in mesh.submeshes as? [MDLSubmesh] ?? [] {
                let indexMap = submesh.indexBuffer.map()
                let indexBuffer = indexMap.bytes

                var indices: [UInt32] = []
                let indexCount = submesh.indexCount

                switch submesh.indexType {
                case .uInt16:
                    let ptr = indexBuffer.assumingMemoryBound(to: UInt16.self)
                    for j in 0..<indexCount {
                        indices.append(UInt32(ptr[j]))
                    }
                case .uInt32:
                    let ptr = indexBuffer.assumingMemoryBound(to: UInt32.self)
                    for j in 0..<indexCount {
                        indices.append(ptr[j])
                    }
                default:
                    continue
                }

                // Classify surface by average normal
                let surfaceType = classifySurface(normals: normals, indices: indices)

                surfaces.append(Surface(
                    vertices: vertices,
                    normals: normals,
                    indices: indices,
                    uvCoordinates: [],
                    type: surfaceType
                ))
            }
        }

        return surfaces
    }

    private func classifySurface(normals: [SIMD3<Float>], indices: [UInt32]) -> SurfaceType {
        // Calculate average normal
        var avgNormal = SIMD3<Float>(0, 0, 0)
        for index in indices {
            avgNormal += normals[Int(index)]
        }
        avgNormal = normalize(avgNormal)

        // Classify based on normal direction
        let upDot = abs(dot(avgNormal, SIMD3<Float>(0, 1, 0)))

        if upDot > 0.8 {
            return avgNormal.y > 0 ? .ceiling : .floor
        } else {
            return .wall
        }
    }

    // MARK: - UV Mapping Generation

    private struct UVMappedMesh {
        var vertices: [SIMD3<Float>]
        var normals: [SIMD3<Float>]
        var uvCoordinates: [SIMD2<Float>]
        var indices: [UInt32]
    }

    private func generateUVMapping(surfaces: [Surface]) -> UVMappedMesh {
        var allVertices: [SIMD3<Float>] = []
        var allNormals: [SIMD3<Float>] = []
        var allUVs: [SIMD2<Float>] = []
        var allIndices: [UInt32] = []

        // Use box projection for UV mapping
        // Each surface gets UV based on its dominant axis

        var indexOffset: UInt32 = 0

        for surface in surfaces {
            let uvs = generateBoxProjectionUVs(
                vertices: surface.vertices,
                normals: surface.normals,
                indices: surface.indices,
                surfaceType: surface.type
            )

            // Add to combined mesh
            for index in surface.indices {
                allIndices.append(index + indexOffset)
            }

            allVertices.append(contentsOf: surface.vertices)
            allNormals.append(contentsOf: surface.normals)
            allUVs.append(contentsOf: uvs)

            indexOffset += UInt32(surface.vertices.count)
        }

        return UVMappedMesh(
            vertices: allVertices,
            normals: allNormals,
            uvCoordinates: allUVs,
            indices: allIndices
        )
    }

    private func generateBoxProjectionUVs(
        vertices: [SIMD3<Float>],
        normals: [SIMD3<Float>],
        indices: [UInt32],
        surfaceType: SurfaceType
    ) -> [SIMD2<Float>] {

        // Find bounding box
        var minBounds = SIMD3<Float>(Float.infinity, Float.infinity, Float.infinity)
        var maxBounds = SIMD3<Float>(-Float.infinity, -Float.infinity, -Float.infinity)

        for vertex in vertices {
            minBounds = min(minBounds, vertex)
            maxBounds = max(maxBounds, vertex)
        }

        let size = maxBounds - minBounds
        let scale = max(size.x, max(size.y, size.z))

        return vertices.enumerated().map { (index, vertex) in
            let normal = normals[index]
            let normalized = (vertex - minBounds) / scale

            // Project based on dominant normal axis
            let absNormal = abs(normal)

            if absNormal.y > absNormal.x && absNormal.y > absNormal.z {
                // Top/bottom - use XZ
                return SIMD2<Float>(normalized.x, normalized.z)
            } else if absNormal.x > absNormal.z {
                // Left/right - use YZ
                return SIMD2<Float>(normalized.z, normalized.y)
            } else {
                // Front/back - use XY
                return SIMD2<Float>(normalized.x, normalized.y)
            }
        }
    }

    // MARK: - Photo Projection

    private func projectPhotosToTexture(
        photos: [CapturedPhotoWithPose],
        surfaces: UVMappedMesh,
        progressCallback: @escaping (Float) -> Void
    ) -> MTLTexture? {

        // Create output texture
        let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .rgba8Unorm,
            width: textureSize,
            height: textureSize,
            mipmapped: false
        )
        textureDescriptor.usage = [.shaderRead, .shaderWrite, .renderTarget]

        guard let outputTexture = device.makeTexture(descriptor: textureDescriptor) else {
            return nil
        }

        // Create weight texture (for blending)
        guard let weightTexture = device.makeTexture(descriptor: textureDescriptor) else {
            return nil
        }

        // Clear textures to black
        clearTexture(outputTexture)
        clearTexture(weightTexture)

        // Project each photo
        for (index, photo) in photos.enumerated() {
            autoreleasepool {
                projectSinglePhoto(
                    photo: photo,
                    surfaces: surfaces,
                    outputTexture: outputTexture,
                    weightTexture: weightTexture
                )
            }
            progressCallback(Float(index + 1) / Float(photos.count))
        }

        return outputTexture
    }

    private func clearTexture(_ texture: MTLTexture) {
        let region = MTLRegion(
            origin: MTLOrigin(x: 0, y: 0, z: 0),
            size: MTLSize(width: texture.width, height: texture.height, depth: 1)
        )
        let bytesPerRow = texture.width * 4
        let zeros = [UInt8](repeating: 0, count: bytesPerRow * texture.height)
        texture.replace(region: region, mipmapLevel: 0, withBytes: zeros, bytesPerRow: bytesPerRow)
    }

    private func projectSinglePhoto(
        photo: CapturedPhotoWithPose,
        surfaces: UVMappedMesh,
        outputTexture: MTLTexture,
        weightTexture: MTLTexture
    ) {
        guard let cgImage = photo.image.cgImage else { return }

        // Create texture from photo
        let textureLoader = MTKTextureLoader(device: device)
        guard let photoTexture = try? textureLoader.newTexture(cgImage: cgImage, options: [
            .textureUsage: NSNumber(value: MTLTextureUsage.shaderRead.rawValue),
            .SRGB: false
        ]) else { return }

        // Calculate view-projection matrix
        let viewMatrix = photo.transform.inverse
        let projectionMatrix = makeProjectionMatrix(intrinsics: photo.intrinsics, width: cgImage.width, height: cgImage.height)
        let viewProjection = projectionMatrix * viewMatrix

        // For each triangle, project and sample
        for i in stride(from: 0, to: surfaces.indices.count, by: 3) {
            let i0 = Int(surfaces.indices[i])
            let i1 = Int(surfaces.indices[i + 1])
            let i2 = Int(surfaces.indices[i + 2])

            let v0 = surfaces.vertices[i0]
            let v1 = surfaces.vertices[i1]
            let v2 = surfaces.vertices[i2]

            let uv0 = surfaces.uvCoordinates[i0]
            let uv1 = surfaces.uvCoordinates[i1]
            let uv2 = surfaces.uvCoordinates[i2]

            // Project vertices to camera space
            let p0 = projectPoint(v0, viewProjection: viewProjection)
            let p1 = projectPoint(v1, viewProjection: viewProjection)
            let p2 = projectPoint(v2, viewProjection: viewProjection)

            // Check if triangle is visible (in front of camera and within frame)
            guard isTriangleVisible(p0, p1, p2) else { continue }

            // Check normal facing camera
            let normal = surfaces.normals[i0]
            let cameraPos = SIMD3<Float>(photo.transform.columns.3.x, photo.transform.columns.3.y, photo.transform.columns.3.z)
            let toCamera = normalize(cameraPos - v0)
            guard dot(normal, toCamera) > 0.1 else { continue }

            // Rasterize triangle to texture
            rasterizeTriangle(
                p0: p0, p1: p1, p2: p2,
                uv0: uv0, uv1: uv1, uv2: uv2,
                photoTexture: photoTexture,
                outputTexture: outputTexture,
                viewAngle: dot(normal, toCamera)
            )
        }
    }

    private func makeProjectionMatrix(intrinsics: simd_float3x3, width: Int, height: Int) -> simd_float4x4 {
        let fx = intrinsics[0][0]
        let fy = intrinsics[1][1]
        let cx = intrinsics[2][0]
        let cy = intrinsics[2][1]

        let near: Float = 0.01
        let far: Float = 100.0

        let w = Float(width)
        let h = Float(height)

        return simd_float4x4(
            SIMD4<Float>(2 * fx / w, 0, 0, 0),
            SIMD4<Float>(0, 2 * fy / h, 0, 0),
            SIMD4<Float>(1 - 2 * cx / w, 2 * cy / h - 1, -(far + near) / (far - near), -1),
            SIMD4<Float>(0, 0, -2 * far * near / (far - near), 0)
        )
    }

    private func projectPoint(_ point: SIMD3<Float>, viewProjection: simd_float4x4) -> SIMD3<Float> {
        let p = viewProjection * SIMD4<Float>(point.x, point.y, point.z, 1.0)
        if p.w <= 0 { return SIMD3<Float>(-999, -999, -999) }
        return SIMD3<Float>(p.x / p.w, p.y / p.w, p.z / p.w)
    }

    private func isTriangleVisible(_ p0: SIMD3<Float>, _ p1: SIMD3<Float>, _ p2: SIMD3<Float>) -> Bool {
        // Check if all points are in front of camera and within normalized device coordinates
        for p in [p0, p1, p2] {
            if p.x < -1.2 || p.x > 1.2 || p.y < -1.2 || p.y > 1.2 || p.z < 0 || p.z > 1 {
                return false
            }
        }
        return true
    }

    private func rasterizeTriangle(
        p0: SIMD3<Float>, p1: SIMD3<Float>, p2: SIMD3<Float>,
        uv0: SIMD2<Float>, uv1: SIMD2<Float>, uv2: SIMD2<Float>,
        photoTexture: MTLTexture,
        outputTexture: MTLTexture,
        viewAngle: Float
    ) {
        // Convert projected coords to photo texture coords
        let tex0 = SIMD2<Float>((p0.x + 1) * 0.5, (1 - p0.y) * 0.5)
        let tex1 = SIMD2<Float>((p1.x + 1) * 0.5, (1 - p1.y) * 0.5)
        let tex2 = SIMD2<Float>((p2.x + 1) * 0.5, (1 - p2.y) * 0.5)

        // Get bounding box in output texture space
        let outSize = Float(textureSize)
        let minX = Int(max(0, min(uv0.x, min(uv1.x, uv2.x)) * outSize))
        let maxX = Int(min(outSize - 1, max(uv0.x, max(uv1.x, uv2.x)) * outSize))
        let minY = Int(max(0, min(uv0.y, min(uv1.y, uv2.y)) * outSize))
        let maxY = Int(min(outSize - 1, max(uv0.y, max(uv1.y, uv2.y)) * outSize))

        // Sample photo and write to output
        let photoWidth = photoTexture.width
        let photoHeight = photoTexture.height

        // Read photo pixels
        var photoPixels = [UInt8](repeating: 0, count: photoWidth * photoHeight * 4)
        let photoRegion = MTLRegion(origin: MTLOrigin(x: 0, y: 0, z: 0),
                                    size: MTLSize(width: photoWidth, height: photoHeight, depth: 1))
        photoTexture.getBytes(&photoPixels, bytesPerRow: photoWidth * 4, from: photoRegion, mipmapLevel: 0)

        // Read current output pixels
        var outputPixels = [UInt8](repeating: 0, count: textureSize * textureSize * 4)
        let outputRegion = MTLRegion(origin: MTLOrigin(x: 0, y: 0, z: 0),
                                     size: MTLSize(width: textureSize, height: textureSize, depth: 1))
        outputTexture.getBytes(&outputPixels, bytesPerRow: textureSize * 4, from: outputRegion, mipmapLevel: 0)

        // Rasterize
        for y in minY...maxY {
            for x in minX...maxX {
                let uvPoint = SIMD2<Float>(Float(x) / outSize, Float(y) / outSize)

                // Calculate barycentric coordinates
                guard let bary = barycentricCoords(point: uvPoint, v0: uv0, v1: uv1, v2: uv2) else { continue }

                // Interpolate texture coordinate
                let texCoord = tex0 * bary.x + tex1 * bary.y + tex2 * bary.z

                // Sample photo
                let px = Int(texCoord.x * Float(photoWidth))
                let py = Int(texCoord.y * Float(photoHeight))

                guard px >= 0 && px < photoWidth && py >= 0 && py < photoHeight else { continue }

                let photoIdx = (py * photoWidth + px) * 4
                let outputIdx = (y * textureSize + x) * 4

                // Weighted blend based on view angle
                let weight = viewAngle
                let existingWeight = Float(outputPixels[outputIdx + 3]) / 255.0
                let totalWeight = existingWeight + weight

                if totalWeight > 0 {
                    for c in 0..<3 {
                        let existing = Float(outputPixels[outputIdx + c]) * existingWeight
                        let new = Float(photoPixels[photoIdx + c]) * weight
                        outputPixels[outputIdx + c] = UInt8(min(255, (existing + new) / totalWeight))
                    }
                    outputPixels[outputIdx + 3] = UInt8(min(255, totalWeight * 255))
                }
            }
        }

        // Write back to texture
        outputTexture.replace(region: outputRegion, mipmapLevel: 0, withBytes: outputPixels, bytesPerRow: textureSize * 4)
    }

    private func barycentricCoords(point: SIMD2<Float>, v0: SIMD2<Float>, v1: SIMD2<Float>, v2: SIMD2<Float>) -> SIMD3<Float>? {
        let v0v1 = v1 - v0
        let v0v2 = v2 - v0
        let v0p = point - v0

        let dot00 = dot(v0v1, v0v1)
        let dot01 = dot(v0v1, v0v2)
        let dot02 = dot(v0v1, v0p)
        let dot11 = dot(v0v2, v0v2)
        let dot12 = dot(v0v2, v0p)

        let invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
        let u = (dot11 * dot02 - dot01 * dot12) * invDenom
        let v = (dot00 * dot12 - dot01 * dot02) * invDenom

        if u >= 0 && v >= 0 && u + v <= 1 {
            return SIMD3<Float>(1 - u - v, u, v)
        }
        return nil
    }

    // MARK: - Texture Blending

    private func blendTextures(_ texture: MTLTexture?) -> UIImage? {
        guard let texture = texture else { return nil }

        // Read texture data
        var pixels = [UInt8](repeating: 0, count: textureSize * textureSize * 4)
        let region = MTLRegion(origin: MTLOrigin(x: 0, y: 0, z: 0),
                               size: MTLSize(width: textureSize, height: textureSize, depth: 1))
        texture.getBytes(&pixels, bytesPerRow: textureSize * 4, from: region, mipmapLevel: 0)

        // Fill holes with neighboring colors (simple inpainting)
        for _ in 0..<3 {  // Multiple passes
            var newPixels = pixels
            for y in 1..<(textureSize - 1) {
                for x in 1..<(textureSize - 1) {
                    let idx = (y * textureSize + x) * 4
                    if pixels[idx + 3] < 10 {  // Empty pixel
                        // Sample neighbors
                        var r: Int = 0, g: Int = 0, b: Int = 0, count: Int = 0
                        for dy in -1...1 {
                            for dx in -1...1 {
                                let nIdx = ((y + dy) * textureSize + (x + dx)) * 4
                                if pixels[nIdx + 3] > 10 {
                                    r += Int(pixels[nIdx])
                                    g += Int(pixels[nIdx + 1])
                                    b += Int(pixels[nIdx + 2])
                                    count += 1
                                }
                            }
                        }
                        if count > 0 {
                            newPixels[idx] = UInt8(r / count)
                            newPixels[idx + 1] = UInt8(g / count)
                            newPixels[idx + 2] = UInt8(b / count)
                            newPixels[idx + 3] = 255
                        }
                    }
                }
            }
            pixels = newPixels
        }

        // Create UIImage
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)

        guard let context = CGContext(
            data: &pixels,
            width: textureSize,
            height: textureSize,
            bitsPerComponent: 8,
            bytesPerRow: textureSize * 4,
            space: colorSpace,
            bitmapInfo: bitmapInfo.rawValue
        ),
        let cgImage = context.makeImage() else {
            return nil
        }

        return UIImage(cgImage: cgImage)
    }

    // MARK: - USDZ Export

    private func exportTexturedUSDZ(
        mesh: UVMappedMesh,
        texture: UIImage?,
        to url: URL
    ) throws {
        // Create MDL mesh with UVs
        let allocator = MTKMeshBufferAllocator(device: device)

        // Create vertex descriptor
        let vertexDescriptor = MDLVertexDescriptor()
        vertexDescriptor.attributes[0] = MDLVertexAttribute(
            name: MDLVertexAttributePosition,
            format: .float3,
            offset: 0,
            bufferIndex: 0
        )
        vertexDescriptor.attributes[1] = MDLVertexAttribute(
            name: MDLVertexAttributeNormal,
            format: .float3,
            offset: MemoryLayout<Float>.size * 3,
            bufferIndex: 0
        )
        vertexDescriptor.attributes[2] = MDLVertexAttribute(
            name: MDLVertexAttributeTextureCoordinate,
            format: .float2,
            offset: MemoryLayout<Float>.size * 6,
            bufferIndex: 0
        )
        vertexDescriptor.layouts[0] = MDLVertexBufferLayout(stride: MemoryLayout<Float>.size * 8)

        // Create interleaved vertex data
        var vertexData: [Float] = []
        for i in 0..<mesh.vertices.count {
            vertexData.append(mesh.vertices[i].x)
            vertexData.append(mesh.vertices[i].y)
            vertexData.append(mesh.vertices[i].z)
            vertexData.append(mesh.normals[i].x)
            vertexData.append(mesh.normals[i].y)
            vertexData.append(mesh.normals[i].z)
            vertexData.append(mesh.uvCoordinates[i].x)
            vertexData.append(mesh.uvCoordinates[i].y)
        }

        let vertexBuffer = allocator.newBuffer(
            with: Data(bytes: vertexData, count: vertexData.count * MemoryLayout<Float>.size),
            type: .vertex
        )

        let indexBuffer = allocator.newBuffer(
            with: Data(bytes: mesh.indices, count: mesh.indices.count * MemoryLayout<UInt32>.size),
            type: .index
        )

        let submesh = MDLSubmesh(
            indexBuffer: indexBuffer,
            indexCount: mesh.indices.count,
            indexType: .uInt32,
            geometryType: .triangles,
            material: nil
        )

        let mdlMesh = MDLMesh(
            vertexBuffer: vertexBuffer,
            vertexCount: mesh.vertices.count,
            descriptor: vertexDescriptor,
            submeshes: [submesh]
        )

        // Create material with texture
        let material = MDLMaterial(name: "TexturedMaterial", scatteringFunction: MDLScatteringFunction())

        if let texture = texture, let textureData = texture.pngData() {
            // Save texture to temp file
            let textureURL = url.deletingLastPathComponent().appendingPathComponent("texture.png")
            try textureData.write(to: textureURL)

            let textureProperty = MDLMaterialProperty(
                name: "baseColor",
                semantic: .baseColor,
                url: textureURL
            )
            material.setProperty(textureProperty)
        }

        submesh.material = material

        // Create asset and export
        let asset = MDLAsset()
        asset.add(mdlMesh)

        try asset.export(to: url)
    }
}

// MARK: - Errors

enum TextureMapperError: Error, LocalizedError {
    case meshLoadFailed
    case textureCreationFailed
    case exportFailed

    var errorDescription: String? {
        switch self {
        case .meshLoadFailed:
            return "Failed to load mesh from USDZ file"
        case .textureCreationFailed:
            return "Failed to create texture"
        case .exportFailed:
            return "Failed to export textured model"
        }
    }
}
