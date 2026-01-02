import Foundation
import Capacitor
import ARKit
import UIKit
import QuickLook
import RealityKit
import AVFoundation

// Only import RoomPlan on iOS 16+
#if canImport(RoomPlan)
import RoomPlan
#endif

@objc(LiDARScannerPlugin)
public class LiDARScannerPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "LiDARScannerPlugin"
    public let jsName = "LiDARScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkLiDARSupport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRoomScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startQuickMeasure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "viewModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSavedScans", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createTexturedModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "processTexturedModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateFloorPlan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportFloorPlanPDF", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportFloorPlanPNG", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveFloorPlanToPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshScanMetadata", returnType: CAPPluginReturnPromise)
    ]

    private var scanHelper: Any? // Will hold RoomScanHelper on iOS 16+
    private var previewController: QLPreviewController?
    private var previewDataSource: ModelPreviewDataSource?

    // MARK: - Check Device Capabilities

    @objc func checkLiDARSupport(_ call: CAPPluginCall) {
        var hasLiDAR = false
        var hasRoomPlan = false

        // Check LiDAR support
        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            hasLiDAR = true
        }

        // Check RoomPlan support (iOS 16+)
        if #available(iOS 16.0, *) {
            #if canImport(RoomPlan)
            hasRoomPlan = RoomCaptureSession.isSupported
            #endif
        }

        call.resolve([
            "hasLiDAR": hasLiDAR,
            "hasRoomPlan": hasRoomPlan,
            "iosVersion": UIDevice.current.systemVersion,
            "deviceModel": UIDevice.current.model
        ])
    }

    // MARK: - Start Room Scan

    @objc func startRoomScan(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("RoomPlan requires iOS 16.0 or later")
            return
        }

        #if canImport(RoomPlan)
        guard RoomCaptureSession.isSupported else {
            call.reject("RoomPlan is not supported on this device. Requires iPhone/iPad Pro with LiDAR.")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let helper = RoomScanHelper()
            self.scanHelper = helper

            helper.startScan(from: self.bridge?.viewController) { result in
                switch result {
                case .success(let roomData):
                    call.resolve(roomData)
                case .failure(let error):
                    call.reject(error.localizedDescription)
                }
                self.scanHelper = nil
            }
        }
        #else
        call.reject("RoomPlan is not available")
        #endif
    }

    // MARK: - View 3D Model

    @objc func viewModel(_ call: CAPPluginCall) {
        guard let modelPath = call.getString("modelPath") else {
            call.reject("Model path is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let fileURL: URL
            if modelPath.starts(with: "/") {
                fileURL = URL(fileURLWithPath: modelPath)
            } else {
                // Check in documents directory
                let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                fileURL = documentsPath.appendingPathComponent("Scans").appendingPathComponent(modelPath)
            }

            guard FileManager.default.fileExists(atPath: fileURL.path) else {
                call.reject("Model file not found at: \(fileURL.path)")
                return
            }

            // Create preview data source
            let dataSource = ModelPreviewDataSource(url: fileURL)
            self.previewDataSource = dataSource

            // Create and present QLPreviewController
            let previewController = QLPreviewController()
            previewController.dataSource = dataSource
            previewController.delegate = dataSource
            self.previewController = previewController

            self.bridge?.viewController?.present(previewController, animated: true) {
                call.resolve(["success": true])
            }
        }
    }

    // MARK: - Get Saved Scans

    @objc func getSavedScans(_ call: CAPPluginCall) {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")

        var scans: [[String: Any]] = []

        do {
            // Create scans folder if it doesn't exist
            if !FileManager.default.fileExists(atPath: scansFolder.path) {
                try FileManager.default.createDirectory(at: scansFolder, withIntermediateDirectories: true)
            }

            let files = try FileManager.default.contentsOfDirectory(at: scansFolder, includingPropertiesForKeys: [.creationDateKey, .fileSizeKey])

            for file in files {
                if file.pathExtension == "usdz" {
                    let attributes = try FileManager.default.attributesOfItem(atPath: file.path)
                    let creationDate = attributes[.creationDate] as? Date ?? Date()
                    let fileSize = attributes[.size] as? Int64 ?? 0

                    // Check for companion JSON metadata
                    let metadataURL = file.deletingPathExtension().appendingPathExtension("json")
                    var metadata: [String: Any] = [:]
                    if FileManager.default.fileExists(atPath: metadataURL.path),
                       let data = try? Data(contentsOf: metadataURL),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        metadata = json
                    }

                    scans.append([
                        "id": file.deletingPathExtension().lastPathComponent,
                        "fileName": file.lastPathComponent,
                        "modelPath": file.path,
                        "createdAt": ISO8601DateFormatter().string(from: creationDate),
                        "fileSize": fileSize,
                        "metadata": metadata
                    ])
                }
            }

            // Sort by creation date (newest first)
            scans.sort { ($0["createdAt"] as? String ?? "") > ($1["createdAt"] as? String ?? "") }

            call.resolve(["scans": scans])
        } catch {
            call.reject("Failed to get saved scans: \(error.localizedDescription)")
        }
    }

    // MARK: - Delete Scan

    @objc func deleteScan(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let modelFile = scansFolder.appendingPathComponent("\(scanId).usdz")
        let metadataFile = scansFolder.appendingPathComponent("\(scanId).json")

        do {
            if FileManager.default.fileExists(atPath: modelFile.path) {
                try FileManager.default.removeItem(at: modelFile)
            }
            if FileManager.default.fileExists(atPath: metadataFile.path) {
                try FileManager.default.removeItem(at: metadataFile)
            }
            call.resolve(["success": true])
        } catch {
            call.reject("Failed to delete scan: \(error.localizedDescription)")
        }
    }

    // MARK: - Quick Measure

    @objc func startQuickMeasure(_ call: CAPPluginCall) {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
            call.reject("LiDAR is not supported on this device")
            return
        }

        call.resolve([
            "status": "Quick measure mode - tap two points to measure distance",
            "supported": true
        ])
    }

    // MARK: - Create Textured Model from Photos (iOS 17+)

    @objc func createTexturedModel(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        // PhotogrammetrySession requires iOS 17+
        if #available(iOS 17.0, *) {
            createTexturedModeliOS17(call: call, scanId: scanId)
        } else {
            call.reject("Textured model creation requires iOS 17.0 or later. Use processTexturedModel for iOS 16+.")
        }
    }

    @available(iOS 17.0, *)
    private func createTexturedModeliOS17(call: CAPPluginCall, scanId: String) {
        // Note: PhotogrammetrySession requires macOS or iOS 17+ with A12+ chip
        // For most iOS devices, the custom TextureMapper (processTexturedModel) works better
        // This is a fallback that may not work on all devices

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let photosFolder = scansFolder.appendingPathComponent("\(scanId)_photos")
        let texturedModelURL = scansFolder.appendingPathComponent("\(scanId)_textured.usdz")

        guard FileManager.default.fileExists(atPath: photosFolder.path) else {
            call.reject("No photos found for this scan")
            return
        }

        // PhotogrammetrySession is primarily designed for macOS
        // On iOS, it has limited support. Recommend using processTexturedModel instead.
        call.reject("Apple's PhotogrammetrySession has limited iOS support. Please use 'Create Realistic 3D Model' button instead which uses our custom texture mapper.")
    }

    // MARK: - Generate Floor Plan

    @objc func generateFloorPlan(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        guard #available(iOS 16.0, *) else {
            call.reject("Floor plan generation requires iOS 16.0 or later")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let metadataFile = scansFolder.appendingPathComponent("\(scanId).json")
        let floorPlanImageFile = scansFolder.appendingPathComponent("\(scanId)_floorplan.png")

        // Debug: List all files in scans folder
        print("FloorPlan: Requested scanId: '\(scanId)'")
        print("FloorPlan: Scans folder: \(scansFolder.path)")
        if let files = try? FileManager.default.contentsOfDirectory(atPath: scansFolder.path) {
            print("FloorPlan: Files in folder: \(files)")
            // Check if any file starts with the scanId
            let matchingFiles = files.filter { $0.hasPrefix(scanId) }
            print("FloorPlan: Files matching scanId: \(matchingFiles)")
        } else {
            print("FloorPlan: Could not list scans folder")
        }

        // Load scan metadata
        print("FloorPlan: Looking for metadata at \(metadataFile.path)")

        var metadata: [String: Any]?

        // Check if metadata file exists
        if FileManager.default.fileExists(atPath: metadataFile.path) {
            if let metadataData = try? Data(contentsOf: metadataFile),
               let json = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] {
                metadata = json
                print("FloorPlan: Loaded metadata from JSON file")
            }
        }

        // If no metadata file, try to find any matching JSON
        if metadata == nil {
            print("FloorPlan: Metadata file does not exist, searching for alternatives...")

            if let files = try? FileManager.default.contentsOfDirectory(atPath: scansFolder.path) {
                let jsonFiles = files.filter { $0.hasSuffix(".json") && !$0.contains("poses") }
                print("FloorPlan: Available JSON files: \(jsonFiles)")

                let scanIdLower = scanId.lowercased()
                if let matchingFile = jsonFiles.first(where: { $0.lowercased().hasPrefix(scanIdLower) }) {
                    let matchingPath = scansFolder.appendingPathComponent(matchingFile)
                    if let data = try? Data(contentsOf: matchingPath),
                       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        metadata = json
                        print("FloorPlan: Found matching metadata: \(matchingFile)")
                    }
                }
            }
        }

        // If still no metadata but USDZ exists, the scan didn't complete properly
        let usdzFile = scansFolder.appendingPathComponent("\(scanId).usdz")
        if metadata == nil && FileManager.default.fileExists(atPath: usdzFile.path) {
            print("FloorPlan: No metadata found but USDZ exists - scan was incomplete")
            print("FloorPlan: The scan was interrupted before room data could be saved")
            print("FloorPlan: This scan can view 3D model but cannot generate floor plans")

            // Check what files exist for this scan
            if let files = try? FileManager.default.contentsOfDirectory(atPath: scansFolder.path) {
                let scanFiles = files.filter { $0.hasPrefix(scanId) }
                print("FloorPlan: Existing files for this scan: \(scanFiles)")
            }

            call.reject("This scan is incomplete and cannot generate a floor plan. The 3D model was saved but the room measurement data was not. Please scan the room again to generate floor plans.")
            return
        }

        guard let finalMetadata = metadata else {
            print("FloorPlan: Could not find or create metadata")
            call.reject("Could not find scan data. Please scan the room again.")
            return
        }

        print("FloorPlan: Loaded metadata with keys: \(finalMetadata.keys)")
        if let summary = finalMetadata["summary"] as? [String: Any] {
            print("FloorPlan: Summary: \(summary)")
        }

        // Generate floor plan from metadata
        let generator = FloorPlanGenerator()
        guard let floorPlan = generator.generateFloorPlan(from: finalMetadata) else {
            print("FloorPlan: Generator returned nil")
            call.reject("Failed to generate floor plan from scan data")
            return
        }

        print("FloorPlan: Generated floor plan with area: \(floorPlan.totalArea) sq ft")

        // Render floor plan image
        let showMeasurements = call.getBool("showMeasurements") ?? true
        let showGrid = call.getBool("showGrid") ?? true
        let showObjects = call.getBool("showObjects") ?? false

        guard let floorPlanImage = generator.renderFloorPlan(floorPlan, showMeasurements: showMeasurements, showGrid: showGrid, showObjects: showObjects) else {
            call.reject("Failed to render floor plan image")
            return
        }

        // Save floor plan image
        do {
            if let pngData = floorPlanImage.pngData() {
                try pngData.write(to: floorPlanImageFile)
            }

            // Convert to base64 for preview
            let base64Image = floorPlanImage.jpegData(compressionQuality: 0.9)?.base64EncodedString() ?? ""

            print("FloorPlan: Resolving with \(floorPlan.objects.count) objects, showObjects=\(showObjects)")

            // Build per-room breakdown data
            var roomsData: [[String: Any]] = []
            for (index, room) in floorPlan.rooms.enumerated() {
                roomsData.append([
                    "index": index,
                    "label": room.label,
                    "area": room.area,
                    "centerX": room.center.x,
                    "centerY": room.center.y
                ])
            }

            call.resolve([
                "success": true,
                "imagePath": floorPlanImageFile.path,
                "imageBase64": "data:image/jpeg;base64,\(base64Image)",
                "totalArea": floorPlan.totalArea,
                "wallCount": floorPlan.walls.count,
                "doorCount": floorPlan.doors.count,
                "windowCount": floorPlan.windows.count,
                "objectCount": floorPlan.objects.count,
                "ceilingHeight": floorPlan.ceilingHeight,
                "roomName": floorPlan.roomName ?? "",
                "rooms": roomsData
            ])
        } catch {
            call.reject("Failed to save floor plan: \(error.localizedDescription)")
        }
    }

    // MARK: - Export Floor Plan as PDF

    @objc func exportFloorPlanPDF(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        guard #available(iOS 16.0, *) else {
            call.reject("Floor plan export requires iOS 16.0 or later")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let metadataFile = scansFolder.appendingPathComponent("\(scanId).json")
        let pdfFile = scansFolder.appendingPathComponent("\(scanId)_floorplan.pdf")

        // Load scan metadata
        guard FileManager.default.fileExists(atPath: metadataFile.path),
              let metadataData = try? Data(contentsOf: metadataFile),
              let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] else {
            call.reject("Could not load scan metadata")
            return
        }

        // Generate floor plan
        let generator = FloorPlanGenerator()
        guard let floorPlan = generator.generateFloorPlan(from: metadata) else {
            call.reject("Failed to generate floor plan from scan data")
            return
        }

        // Export to PDF
        let showMeasurements = call.getBool("showMeasurements") ?? true
        guard let pdfData = generator.exportToPDF(floorPlan, showMeasurements: showMeasurements) else {
            call.reject("Failed to export floor plan as PDF")
            return
        }

        // Save PDF file
        do {
            try pdfData.write(to: pdfFile)

            call.resolve([
                "success": true,
                "pdfPath": pdfFile.path,
                "fileName": "\(scanId)_floorplan.pdf"
            ])
        } catch {
            call.reject("Failed to save PDF: \(error.localizedDescription)")
        }
    }

    // MARK: - Export Floor Plan as PNG

    @objc func exportFloorPlanPNG(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        guard #available(iOS 16.0, *) else {
            call.reject("Floor plan export requires iOS 16.0 or later")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let metadataFile = scansFolder.appendingPathComponent("\(scanId).json")
        let pngFile = scansFolder.appendingPathComponent("\(scanId)_floorplan.png")

        // Load scan metadata
        guard FileManager.default.fileExists(atPath: metadataFile.path),
              let metadataData = try? Data(contentsOf: metadataFile),
              let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] else {
            call.reject("Could not load scan metadata")
            return
        }

        // Generate floor plan
        let generator = FloorPlanGenerator()
        guard let floorPlan = generator.generateFloorPlan(from: metadata) else {
            call.reject("Failed to generate floor plan from scan data")
            return
        }

        // Get custom size if provided
        var exportSize: CGSize? = nil
        if let width = call.getInt("width"), let height = call.getInt("height") {
            exportSize = CGSize(width: width, height: height)
        }

        // Export to PNG
        let showMeasurements = call.getBool("showMeasurements") ?? true
        guard let pngData = generator.exportToPNG(floorPlan, size: exportSize, showMeasurements: showMeasurements) else {
            call.reject("Failed to export floor plan as PNG")
            return
        }

        // Save PNG file
        do {
            try pngData.write(to: pngFile)

            // Also return base64 for preview
            let base64 = pngData.base64EncodedString()

            call.resolve([
                "success": true,
                "pngPath": pngFile.path,
                "fileName": "\(scanId)_floorplan.png",
                "imageBase64": "data:image/png;base64,\(base64)"
            ])
        } catch {
            call.reject("Failed to save PNG: \(error.localizedDescription)")
        }
    }

    // MARK: - Save Floor Plan to Photos Library

    @objc func saveFloorPlanToPhotos(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        guard #available(iOS 16.0, *) else {
            call.reject("Floor plan export requires iOS 16.0 or later")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let metadataFile = scansFolder.appendingPathComponent("\(scanId).json")

        // Load scan metadata
        guard FileManager.default.fileExists(atPath: metadataFile.path),
              let metadataData = try? Data(contentsOf: metadataFile),
              let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] else {
            call.reject("Could not load scan metadata")
            return
        }

        // Generate floor plan
        let generator = FloorPlanGenerator()
        guard let floorPlan = generator.generateFloorPlan(from: metadata) else {
            call.reject("Failed to generate floor plan from scan data")
            return
        }

        // Render floor plan image at high resolution
        let exportSize = CGSize(width: 2400, height: 1800) // High res for photos
        guard let floorPlanImage = generator.renderFloorPlan(floorPlan, size: exportSize, showMeasurements: true, showGrid: true) else {
            call.reject("Failed to render floor plan image")
            return
        }

        // Save to Photos library
        UIImageWriteToSavedPhotosAlbum(floorPlanImage, self, #selector(imageSaveCompleted(_:didFinishSavingWithError:contextInfo:)), nil)

        // Store the call for the completion callback
        self.pendingPhotoSaveCall = call
    }

    private var pendingPhotoSaveCall: CAPPluginCall?

    @objc private func imageSaveCompleted(_ image: UIImage, didFinishSavingWithError error: Error?, contextInfo: UnsafeRawPointer?) {
        DispatchQueue.main.async { [weak self] in
            if let error = error {
                self?.pendingPhotoSaveCall?.reject("Failed to save to Photos: \(error.localizedDescription)")
            } else {
                self?.pendingPhotoSaveCall?.resolve([
                    "success": true,
                    "message": "Floor plan saved to Photos"
                ])
            }
            self?.pendingPhotoSaveCall = nil
        }
    }

    // MARK: - Refresh Scan Metadata
    // Note: CapturedRoom cannot be reloaded from USDZ file. Objects must be captured during initial scan.
    // This method simply informs the user that older scans don't support object detection.

    @objc func refreshScanMetadata(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let metadataURL = scansFolder.appendingPathComponent("\(scanId)_metadata.json")

        // Check metadata exists
        guard FileManager.default.fileExists(atPath: metadataURL.path),
              let metadataData = try? Data(contentsOf: metadataURL),
              let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] else {
            call.reject("Could not load scan metadata")
            return
        }

        // Check if objects already exist in metadata
        if let objects = metadata["objects"] as? [[String: Any]], !objects.isEmpty {
            call.resolve([
                "success": true,
                "objectCount": objects.count,
                "message": "Scan already has \(objects.count) objects"
            ])
            return
        }

        // Objects can't be recovered from old scans - USDZ doesn't store CapturedRoom data
        call.reject("This scan was created before furniture detection was added. Please create a new scan to detect furniture.")
    }

    // MARK: - Process Textured Model with Custom Texture Mapper

    @objc func processTexturedModel(_ call: CAPPluginCall) {
        guard let scanId = call.getString("scanId") else {
            call.reject("Scan ID is required")
            return
        }

        guard #available(iOS 16.0, *) else {
            call.reject("Texture processing requires iOS 16.0 or later")
            return
        }

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")
        let modelURL = scansFolder.appendingPathComponent("\(scanId).usdz")
        let photosFolder = scansFolder.appendingPathComponent("\(scanId)_photos")
        let posesFile = scansFolder.appendingPathComponent("\(scanId)_poses.json")
        let texturedModelURL = scansFolder.appendingPathComponent("\(scanId)_textured.usdz")

        // Check model exists
        guard FileManager.default.fileExists(atPath: modelURL.path) else {
            call.reject("No model found for this scan")
            return
        }

        // Check photos exist
        guard FileManager.default.fileExists(atPath: photosFolder.path) else {
            call.reject("No photos found for this scan")
            return
        }

        // Load photos with poses
        var photosWithPoses: [CapturedPhotoWithPose] = []

        do {
            // Try to load poses from JSON
            if FileManager.default.fileExists(atPath: posesFile.path),
               let posesData = try? Data(contentsOf: posesFile),
               let posesJson = try? JSONSerialization.jsonObject(with: posesData) as? [[String: Any]] {

                let photoFiles = try FileManager.default.contentsOfDirectory(at: photosFolder, includingPropertiesForKeys: nil)
                    .filter { $0.pathExtension.lowercased() == "jpg" || $0.pathExtension.lowercased() == "jpeg" }
                    .sorted { $0.lastPathComponent < $1.lastPathComponent }

                for (index, photoURL) in photoFiles.enumerated() {
                    guard let image = UIImage(contentsOfFile: photoURL.path),
                          index < posesJson.count else { continue }

                    let poseData = posesJson[index]

                    // Parse transform matrix
                    let transform: simd_float4x4
                    if let transformArray = poseData["transform"] as? [Double], transformArray.count == 16 {
                        transform = simd_float4x4(
                            SIMD4<Float>(Float(transformArray[0]), Float(transformArray[1]), Float(transformArray[2]), Float(transformArray[3])),
                            SIMD4<Float>(Float(transformArray[4]), Float(transformArray[5]), Float(transformArray[6]), Float(transformArray[7])),
                            SIMD4<Float>(Float(transformArray[8]), Float(transformArray[9]), Float(transformArray[10]), Float(transformArray[11])),
                            SIMD4<Float>(Float(transformArray[12]), Float(transformArray[13]), Float(transformArray[14]), Float(transformArray[15]))
                        )
                    } else {
                        transform = matrix_identity_float4x4
                    }

                    // Parse intrinsics
                    let intrinsics: simd_float3x3
                    if let intrinsicsArray = poseData["intrinsics"] as? [Double], intrinsicsArray.count == 9 {
                        intrinsics = simd_float3x3(
                            SIMD3<Float>(Float(intrinsicsArray[0]), Float(intrinsicsArray[1]), Float(intrinsicsArray[2])),
                            SIMD3<Float>(Float(intrinsicsArray[3]), Float(intrinsicsArray[4]), Float(intrinsicsArray[5])),
                            SIMD3<Float>(Float(intrinsicsArray[6]), Float(intrinsicsArray[7]), Float(intrinsicsArray[8]))
                        )
                    } else {
                        // Default iPhone intrinsics
                        intrinsics = simd_float3x3(
                            SIMD3<Float>(1500, 0, 960),
                            SIMD3<Float>(0, 1500, 540),
                            SIMD3<Float>(0, 0, 1)
                        )
                    }

                    let timestamp = poseData["timestamp"] as? TimeInterval ?? TimeInterval(index)

                    photosWithPoses.append(CapturedPhotoWithPose(
                        image: image,
                        transform: transform,
                        intrinsics: intrinsics,
                        timestamp: timestamp
                    ))
                }
            } else {
                // No poses file - load photos with default transforms (less accurate but still works)
                let photoFiles = try FileManager.default.contentsOfDirectory(at: photosFolder, includingPropertiesForKeys: nil)
                    .filter { $0.pathExtension.lowercased() == "jpg" || $0.pathExtension.lowercased() == "jpeg" }

                for (index, photoURL) in photoFiles.enumerated() {
                    guard let image = UIImage(contentsOfFile: photoURL.path) else { continue }

                    // Create evenly spaced camera positions around the room
                    let angle = Float(index) * (2.0 * .pi / Float(photoFiles.count))
                    let radius: Float = 3.0

                    var transform = matrix_identity_float4x4
                    transform.columns.3.x = cos(angle) * radius
                    transform.columns.3.z = sin(angle) * radius
                    transform.columns.3.y = 1.5

                    photosWithPoses.append(CapturedPhotoWithPose(
                        image: image,
                        transform: transform,
                        intrinsics: simd_float3x3(
                            SIMD3<Float>(1500, 0, 960),
                            SIMD3<Float>(0, 1500, 540),
                            SIMD3<Float>(0, 0, 1)
                        ),
                        timestamp: TimeInterval(index)
                    ))
                }
            }

            guard !photosWithPoses.isEmpty else {
                call.reject("No valid photos found")
                return
            }

            // Create texture mapper
            guard let textureMapper = TextureMapper() else {
                call.reject("Failed to initialize texture mapper (Metal not available)")
                return
            }

            // Process textures
            textureMapper.createTexturedModel(
                meshURL: modelURL,
                photos: photosWithPoses,
                outputURL: texturedModelURL,
                progress: { progress, status in
                    print("Texture processing: \(Int(progress * 100))% - \(status)")
                },
                completion: { result in
                    DispatchQueue.main.async {
                        switch result {
                        case .success(let outputURL):
                            call.resolve([
                                "success": true,
                                "texturedModelPath": outputURL.path,
                                "photoCount": photosWithPoses.count
                            ])
                        case .failure(let error):
                            call.reject("Texture processing failed: \(error.localizedDescription)")
                        }
                    }
                }
            )

        } catch {
            call.reject("Failed to load photos: \(error.localizedDescription)")
        }
    }
}

// MARK: - Model Preview Data Source

class ModelPreviewDataSource: NSObject, QLPreviewControllerDataSource, QLPreviewControllerDelegate {
    let url: URL

    init(url: URL) {
        self.url = url
        super.init()
    }

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        return 1
    }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        return url as QLPreviewItem
    }
}

// MARK: - Room Scan Helper (iOS 16+ only)

#if canImport(RoomPlan)
@available(iOS 16.0, *)
class RoomScanHelper: NSObject {

    private var roomCaptureView: RoomCaptureView?
    private var scanViewController: UIViewController?
    private var completion: ((Result<[String: Any], Error>) -> Void)?
    private var roomDelegate: RoomDelegate?
    private var capturedRoom: CapturedRoom?
    private var capturedPhotos: [(image: UIImage, transform: simd_float4x4, intrinsics: simd_float3x3, timestamp: TimeInterval)] = []
    private var photoTimer: Timer?
    private var photoCount = 0
    private let maxPhotos = 30 // Capture up to 30 photos during scan

    // Ultra-wide camera capture session for 0.5x photos
    private var ultraWideCaptureSession: AVCaptureSession?
    private var ultraWidePhotoOutput: AVCapturePhotoOutput?
    private var ultraWideCameraDevice: AVCaptureDevice?
    private var lastUltraWideImage: UIImage?
    private var ultraWideIntrinsics: simd_float3x3?

    // Photo quality tracking
    private var lastCaptureTransform: simd_float4x4?
    private var lastCaptureTime: TimeInterval = 0
    private let minMovementThreshold: Float = 0.15 // Minimum movement between captures (meters)
    private let maxAngularVelocity: Float = 0.3 // Max rotation speed for sharp photos (rad/s)
    private var previousFrameTime: TimeInterval = 0
    private var previousFrameTransform: simd_float4x4?

    func startScan(from viewController: UIViewController?, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        self.completion = completion

        guard let viewController = viewController else {
            completion(.failure(NSError(domain: "LiDARScanner", code: -1, userInfo: [NSLocalizedDescriptionKey: "No view controller available"])))
            return
        }

        // Create RoomCaptureView
        let roomCaptureView = RoomCaptureView(frame: UIScreen.main.bounds)
        self.roomCaptureView = roomCaptureView

        // Create delegate
        let delegate = RoomDelegate { [weak self] result in
            self?.handleResult(result)
        }
        self.roomDelegate = delegate

        roomCaptureView.delegate = delegate
        roomCaptureView.captureSession.delegate = delegate

        // Create view controller
        let scanVC = UIViewController()
        scanVC.view.backgroundColor = .black
        scanVC.view.addSubview(roomCaptureView)
        roomCaptureView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            roomCaptureView.topAnchor.constraint(equalTo: scanVC.view.topAnchor),
            roomCaptureView.bottomAnchor.constraint(equalTo: scanVC.view.bottomAnchor),
            roomCaptureView.leadingAnchor.constraint(equalTo: scanVC.view.leadingAnchor),
            roomCaptureView.trailingAnchor.constraint(equalTo: scanVC.view.trailingAnchor)
        ])
        scanVC.modalPresentationStyle = .fullScreen

        // Add buttons
        addButtons(to: scanVC)

        self.scanViewController = scanVC

        // Present and start
        viewController.present(scanVC, animated: true) { [weak self] in
            let configuration = RoomCaptureSession.Configuration()
            roomCaptureView.captureSession.run(configuration: configuration)

            // Start capturing photos every 1.5 seconds
            self?.startPhotoCapture()
        }
    }

    private func startPhotoCapture() {
        // Setup ultra-wide camera for 0.5x photos
        setupUltraWideCamera()

        photoTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            self?.capturePhoto()
        }
    }

    private func setupUltraWideCamera() {
        // Find ultra-wide camera (0.5x)
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInUltraWideCamera],
            mediaType: .video,
            position: .back
        )

        guard let ultraWideCamera = discoverySession.devices.first else {
            print("Ultra-wide camera not available, using standard ARKit camera")
            return
        }

        do {
            // Configure camera for optimal photo quality
            try ultraWideCamera.lockForConfiguration()

            // Set focus to a good distance for room scanning (2-3 meters)
            if ultraWideCamera.isFocusModeSupported(.continuousAutoFocus) {
                ultraWideCamera.focusMode = .continuousAutoFocus
            }

            // Lock auto-focus at infinity for room scanning (if supported)
            if ultraWideCamera.isLockingFocusWithCustomLensPositionSupported {
                // 1.0 = infinity, good for room-scale scanning
                ultraWideCamera.setFocusModeLocked(lensPosition: 0.85) { _ in }
            }

            // Enable auto-exposure with bias for well-lit interiors
            if ultraWideCamera.isExposureModeSupported(.continuousAutoExposure) {
                ultraWideCamera.exposureMode = .continuousAutoExposure
            }

            // Set exposure bias slightly positive for interiors
            let targetBias = min(ultraWideCamera.maxExposureTargetBias, 0.5)
            ultraWideCamera.setExposureTargetBias(targetBias)

            // Enable optical image stabilization if available
            if ultraWideCamera.activeFormat.isVideoStabilizationModeSupported(.cinematic) {
                // OIS is handled at the connection level, set below
            }

            // Set to highest quality format available
            let formats = ultraWideCamera.formats.filter { format in
                let dimensions = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
                return dimensions.width >= 1920
            }
            if let bestFormat = formats.last {
                ultraWideCamera.activeFormat = bestFormat
            }

            ultraWideCamera.unlockForConfiguration()

            let captureSession = AVCaptureSession()
            captureSession.sessionPreset = .photo

            let input = try AVCaptureDeviceInput(device: ultraWideCamera)
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
            }

            let photoOutput = AVCapturePhotoOutput()
            if captureSession.canAddOutput(photoOutput) {
                captureSession.addOutput(photoOutput)
                // Use quality prioritization for sharpest photos
                photoOutput.maxPhotoQualityPrioritization = .quality
            }

            // Enable video stabilization on the connection if available
            if let connection = photoOutput.connection(with: .video) {
                if connection.isVideoStabilizationSupported {
                    connection.preferredVideoStabilizationMode = .auto
                }
            }

            // Calculate intrinsics for ultra-wide camera
            // Typical iPhone ultra-wide: ~13mm equivalent, ~120° FOV
            let focalLength: Float = 1100 // Approximate for ultra-wide at 1920px width
            ultraWideIntrinsics = simd_float3x3(
                SIMD3<Float>(focalLength, 0, 960),
                SIMD3<Float>(0, focalLength, 540),
                SIMD3<Float>(0, 0, 1)
            )

            self.ultraWideCaptureSession = captureSession
            self.ultraWidePhotoOutput = photoOutput
            self.ultraWideCameraDevice = ultraWideCamera

            // Start session on background thread
            DispatchQueue.global(qos: .userInitiated).async {
                captureSession.startRunning()
            }

            print("Ultra-wide camera (0.5x) setup complete with optimized settings")
        } catch {
            print("Failed to setup ultra-wide camera: \(error)")
        }
    }

    private func capturePhoto() {
        guard photoCount < maxPhotos,
              let roomCaptureView = roomCaptureView else { return }

        // Get camera pose from ARKit (even if using ultra-wide camera for image)
        let arSession = roomCaptureView.captureSession.arSession
        guard let currentFrame = arSession.currentFrame else { return }

        let cameraTransform = currentFrame.camera.transform
        let timestamp = currentFrame.timestamp

        // Check if device is moving too fast (motion blur prevention)
        let isSteady = checkDeviceStability(currentTransform: cameraTransform, currentTime: timestamp)
        updateSteadyIndicator(isSteady: isSteady)

        // Only capture if device is relatively steady
        guard isSteady else {
            print("Skipping photo - device moving too fast")
            return
        }

        // Check minimum movement since last capture (avoid duplicates)
        if let lastTransform = lastCaptureTransform {
            let movement = distance(from: lastTransform, to: cameraTransform)
            if movement < minMovementThreshold {
                print("Skipping photo - not enough movement (\(String(format: "%.2f", movement))m)")
                return
            }
        }

        // Try to capture from ultra-wide camera (0.5x) for wider FOV
        if let photoOutput = ultraWidePhotoOutput,
           let captureSession = ultraWideCaptureSession,
           captureSession.isRunning {

            // Capture ultra-wide photo asynchronously
            let settings = AVCapturePhotoSettings()
            settings.flashMode = .off

            let photoCaptureDelegate = UltraWidePhotoCaptureDelegate { [weak self] image in
                guard let self = self, let image = image else { return }

                // Resize to reasonable size
                if let resized = self.resizeImage(image, targetSize: CGSize(width: 1920, height: 1080)) {
                    // Use ultra-wide intrinsics
                    let intrinsics = self.ultraWideIntrinsics ?? simd_float3x3(
                        SIMD3<Float>(1100, 0, 960),
                        SIMD3<Float>(0, 1100, 540),
                        SIMD3<Float>(0, 0, 1)
                    )

                    self.capturedPhotos.append((
                        image: resized,
                        transform: cameraTransform,
                        intrinsics: intrinsics,
                        timestamp: timestamp
                    ))
                    self.photoCount += 1
                    self.lastCaptureTransform = cameraTransform
                    self.lastCaptureTime = timestamp
                    self.updatePhotoCount()
                    self.updateSteadyIndicator(isSteady: true, capturedPhoto: true)
                    print("Captured ultra-wide (0.5x) photo \(self.photoCount)/\(self.maxPhotos) with pose")
                }
            }

            photoOutput.capturePhoto(with: settings, delegate: photoCaptureDelegate)

        } else {
            // Fallback to ARKit camera if ultra-wide not available
            let pixelBuffer = currentFrame.capturedImage
            let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
            let context = CIContext()

            if let cgImage = context.createCGImage(ciImage, from: ciImage.extent) {
                // Rotate image to correct orientation
                let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)

                // Resize to reasonable size (1920x1080)
                if let resized = resizeImage(uiImage, targetSize: CGSize(width: 1920, height: 1080)) {
                    let cameraIntrinsics = currentFrame.camera.intrinsics

                    capturedPhotos.append((
                        image: resized,
                        transform: cameraTransform,
                        intrinsics: cameraIntrinsics,
                        timestamp: timestamp
                    ))
                    photoCount += 1
                    lastCaptureTransform = cameraTransform
                    lastCaptureTime = timestamp
                    updatePhotoCount()
                    updateSteadyIndicator(isSteady: true, capturedPhoto: true)
                    print("Captured standard photo \(photoCount)/\(maxPhotos) with pose")
                }
            }
        }
    }

    // Check if device is stable enough for a sharp photo
    private func checkDeviceStability(currentTransform: simd_float4x4, currentTime: TimeInterval) -> Bool {
        guard let previousTransform = previousFrameTransform else {
            previousFrameTransform = currentTransform
            previousFrameTime = currentTime
            return true // First frame, assume steady
        }

        let deltaTime = currentTime - previousFrameTime
        guard deltaTime > 0 else { return true }

        // Calculate angular velocity (rotation speed)
        let currentRotation = simd_quatf(currentTransform)
        let previousRotation = simd_quatf(previousTransform)
        let rotationDiff = currentRotation.inverse * previousRotation
        let angle = 2 * acos(min(1.0, abs(rotationDiff.real)))
        let angularVelocity = Float(angle) / Float(deltaTime)

        // Calculate linear velocity
        let currentPos = SIMD3<Float>(currentTransform.columns.3.x, currentTransform.columns.3.y, currentTransform.columns.3.z)
        let previousPos = SIMD3<Float>(previousTransform.columns.3.x, previousTransform.columns.3.y, previousTransform.columns.3.z)
        let linearVelocity = length(currentPos - previousPos) / Float(deltaTime)

        // Update for next frame
        previousFrameTransform = currentTransform
        previousFrameTime = currentTime

        // Device is steady if both rotation and movement are slow enough
        let isSteady = angularVelocity < maxAngularVelocity && linearVelocity < 0.5
        return isSteady
    }

    // Calculate distance between two transforms
    private func distance(from t1: simd_float4x4, to t2: simd_float4x4) -> Float {
        let p1 = SIMD3<Float>(t1.columns.3.x, t1.columns.3.y, t1.columns.3.z)
        let p2 = SIMD3<Float>(t2.columns.3.x, t2.columns.3.y, t2.columns.3.z)
        return length(p2 - p1)
    }

    private func resizeImage(_ image: UIImage, targetSize: CGSize) -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }

    private func stopPhotoCapture() {
        photoTimer?.invalidate()
        photoTimer = nil

        // Stop ultra-wide camera session
        ultraWideCaptureSession?.stopRunning()
        ultraWideCaptureSession = nil
        ultraWidePhotoOutput = nil
    }

    // UI Elements for feedback
    private var steadyIndicatorView: UIView?
    private var steadyLabel: UILabel?
    private var photoCountLabel: UILabel?
    private var isDeviceSteady: Bool = false

    private func addButtons(to scanVC: UIViewController) {
        let closeButton = UIButton(type: .system)
        closeButton.setTitle("Cancel", for: .normal)
        closeButton.setTitleColor(.white, for: .normal)
        closeButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        closeButton.layer.cornerRadius = 20
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(cancelScan), for: .touchUpInside)
        scanVC.view.addSubview(closeButton)

        let doneButton = UIButton(type: .system)
        doneButton.setTitle("Done", for: .normal)
        doneButton.setTitleColor(.white, for: .normal)
        doneButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        doneButton.backgroundColor = UIColor.systemOrange
        doneButton.layer.cornerRadius = 20
        doneButton.translatesAutoresizingMaskIntoConstraints = false
        doneButton.addTarget(self, action: #selector(finishScan), for: .touchUpInside)
        scanVC.view.addSubview(doneButton)

        // Steady indicator at bottom
        let steadyContainer = UIView()
        steadyContainer.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        steadyContainer.layer.cornerRadius = 25
        steadyContainer.translatesAutoresizingMaskIntoConstraints = false
        scanVC.view.addSubview(steadyContainer)
        self.steadyIndicatorView = steadyContainer

        let steadyDot = UIView()
        steadyDot.backgroundColor = UIColor.systemYellow
        steadyDot.layer.cornerRadius = 6
        steadyDot.translatesAutoresizingMaskIntoConstraints = false
        steadyDot.tag = 100 // Tag to find it later
        steadyContainer.addSubview(steadyDot)

        let steadyText = UILabel()
        steadyText.text = "Move slowly for best photos"
        steadyText.textColor = .white
        steadyText.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        steadyText.translatesAutoresizingMaskIntoConstraints = false
        steadyContainer.addSubview(steadyText)
        self.steadyLabel = steadyText

        // Photo count indicator
        let countLabel = UILabel()
        countLabel.text = "📸 0/\(maxPhotos)"
        countLabel.textColor = .white
        countLabel.font = UIFont.monospacedDigitSystemFont(ofSize: 14, weight: .semibold)
        countLabel.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        countLabel.textAlignment = .center
        countLabel.layer.cornerRadius = 15
        countLabel.clipsToBounds = true
        countLabel.translatesAutoresizingMaskIntoConstraints = false
        scanVC.view.addSubview(countLabel)
        self.photoCountLabel = countLabel

        NSLayoutConstraint.activate([
            closeButton.topAnchor.constraint(equalTo: scanVC.view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeButton.leadingAnchor.constraint(equalTo: scanVC.view.leadingAnchor, constant: 16),
            closeButton.widthAnchor.constraint(equalToConstant: 80),
            closeButton.heightAnchor.constraint(equalToConstant: 40),

            doneButton.topAnchor.constraint(equalTo: scanVC.view.safeAreaLayoutGuide.topAnchor, constant: 16),
            doneButton.trailingAnchor.constraint(equalTo: scanVC.view.trailingAnchor, constant: -16),
            doneButton.widthAnchor.constraint(equalToConstant: 80),
            doneButton.heightAnchor.constraint(equalToConstant: 40),

            // Photo count - top center
            countLabel.topAnchor.constraint(equalTo: scanVC.view.safeAreaLayoutGuide.topAnchor, constant: 16),
            countLabel.centerXAnchor.constraint(equalTo: scanVC.view.centerXAnchor),
            countLabel.widthAnchor.constraint(equalToConstant: 80),
            countLabel.heightAnchor.constraint(equalToConstant: 30),

            // Steady indicator - bottom center
            steadyContainer.bottomAnchor.constraint(equalTo: scanVC.view.safeAreaLayoutGuide.bottomAnchor, constant: -100),
            steadyContainer.centerXAnchor.constraint(equalTo: scanVC.view.centerXAnchor),
            steadyContainer.heightAnchor.constraint(equalToConstant: 50),
            steadyContainer.widthAnchor.constraint(greaterThanOrEqualToConstant: 220),

            steadyDot.leadingAnchor.constraint(equalTo: steadyContainer.leadingAnchor, constant: 16),
            steadyDot.centerYAnchor.constraint(equalTo: steadyContainer.centerYAnchor),
            steadyDot.widthAnchor.constraint(equalToConstant: 12),
            steadyDot.heightAnchor.constraint(equalToConstant: 12),

            steadyText.leadingAnchor.constraint(equalTo: steadyDot.trailingAnchor, constant: 10),
            steadyText.trailingAnchor.constraint(equalTo: steadyContainer.trailingAnchor, constant: -16),
            steadyText.centerYAnchor.constraint(equalTo: steadyContainer.centerYAnchor)
        ])
    }

    private func updateSteadyIndicator(isSteady: Bool, capturedPhoto: Bool = false) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let container = self.steadyIndicatorView,
                  let label = self.steadyLabel,
                  let dot = container.viewWithTag(100) else { return }

            self.isDeviceSteady = isSteady

            if capturedPhoto {
                // Flash green briefly when photo captured
                dot.backgroundColor = UIColor.systemGreen
                label.text = "✓ Photo captured!"
                UIView.animate(withDuration: 0.3, delay: 0.5, options: [], animations: {
                    dot.backgroundColor = isSteady ? UIColor.systemGreen : UIColor.systemYellow
                    label.text = isSteady ? "Hold steady..." : "Move slowly for best photos"
                })
            } else if isSteady {
                dot.backgroundColor = UIColor.systemGreen
                label.text = "Hold steady..."
            } else {
                dot.backgroundColor = UIColor.systemYellow
                label.text = "Move slowly for best photos"
            }
        }
    }

    private func updatePhotoCount() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.photoCountLabel?.text = "📸 \(self.photoCount)/\(self.maxPhotos)"
        }
    }

    @objc private func cancelScan() {
        stopPhotoCapture()
        roomCaptureView?.captureSession.stop()
        scanViewController?.dismiss(animated: true)
        completion?(.failure(NSError(domain: "LiDARScanner", code: -2, userInfo: [NSLocalizedDescriptionKey: "Scan cancelled by user"])))
        cleanup()
    }

    @objc private func finishScan() {
        stopPhotoCapture()
        roomCaptureView?.captureSession.stop()
    }

    private func handleResult(_ result: Result<CapturedRoom, Error>) {
        switch result {
        case .success(let room):
            self.capturedRoom = room

            // Export USDZ and save scan
            var roomData = extractRoomData(from: room)

            // Save the 3D model
            if let modelInfo = saveModel(room: room, roomData: roomData) {
                roomData["modelPath"] = modelInfo["modelPath"]
                roomData["scanId"] = modelInfo["scanId"]
            }

            DispatchQueue.main.async { [weak self] in
                self?.scanViewController?.dismiss(animated: true) {
                    self?.completion?(.success(roomData))
                    self?.cleanup()
                }
            }
        case .failure(let error):
            DispatchQueue.main.async { [weak self] in
                self?.scanViewController?.dismiss(animated: true)
                self?.completion?(.failure(error))
                self?.cleanup()
            }
        }
    }

    private func saveModel(room: CapturedRoom, roomData: [String: Any]) -> [String: Any]? {
        // Debug: Log what RoomPlan actually detected
        print("=== saveModel: RoomPlan Detection Summary ===")
        print("  Walls: \(room.walls.count)")
        print("  Doors: \(room.doors.count)")
        print("  Windows: \(room.windows.count)")
        print("  Openings: \(room.openings.count)")
        print("  Objects/Furniture: \(room.objects.count)")
        for (index, obj) in room.objects.enumerated() {
            print("    Object \(index): \(objectCategoryName(obj.category)) - dims: \(obj.dimensions)")
        }
        print("============================================")

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let scansFolder = documentsPath.appendingPathComponent("Scans")

        // Create scans folder if needed
        do {
            if !FileManager.default.fileExists(atPath: scansFolder.path) {
                try FileManager.default.createDirectory(at: scansFolder, withIntermediateDirectories: true)
            }
        } catch {
            print("Failed to create scans folder: \(error)")
            return nil
        }

        // Generate unique scan ID
        let scanId = UUID().uuidString
        let modelURL = scansFolder.appendingPathComponent("\(scanId).usdz")
        let metadataURL = scansFolder.appendingPathComponent("\(scanId).json")
        let photosFolder = scansFolder.appendingPathComponent("\(scanId)_photos")
        let posesURL = scansFolder.appendingPathComponent("\(scanId)_poses.json")

        // Export USDZ with parametric model (includes geometry)
        do {
            // IMPORTANT: Save metadata FIRST so floor plan generation works even if photo save fails
            var metadata = roomData
            metadata["scanId"] = scanId
            metadata["modelPath"] = modelURL.path
            metadata["photoCount"] = capturedPhotos.count
            metadata["photosPath"] = capturedPhotos.isEmpty ? nil : photosFolder.path
            metadata["hasPoses"] = !capturedPhotos.isEmpty

            // Log objects being saved
            if let objectsArray = metadata["objects"] as? [[String: Any]] {
                print("saveModel: Saving \(objectsArray.count) objects to metadata")
            } else {
                print("saveModel: WARNING - No objects in metadata!")
            }

            let jsonData = try JSONSerialization.data(withJSONObject: metadata, options: .prettyPrinted)
            try jsonData.write(to: metadataURL)
            print("saveModel: Metadata saved FIRST to \(metadataURL.path)")

            // Export mesh for more realistic representation
            if #available(iOS 17.0, *) {
                try room.export(to: modelURL, exportOptions: .mesh)
            } else {
                try room.export(to: modelURL, exportOptions: .model)
            }
            print("saveModel: USDZ model exported to \(modelURL.path)")

            // Save captured photos with poses for texture mapping (can be slow, do last)
            if !capturedPhotos.isEmpty {
                try FileManager.default.createDirectory(at: photosFolder, withIntermediateDirectories: true)

                var posesData: [[String: Any]] = []

                for (index, photoData) in capturedPhotos.enumerated() {
                    let photoURL = photosFolder.appendingPathComponent("photo_\(String(format: "%03d", index)).jpg")
                    if let jpegData = photoData.image.jpegData(compressionQuality: 0.85) {
                        try jpegData.write(to: photoURL)
                    }

                    // Save camera pose data
                    let transform = photoData.transform
                    let intrinsics = photoData.intrinsics

                    // Build transform array separately to help compiler
                    var transformArray: [Double] = []
                    transformArray.append(Double(transform.columns.0.x))
                    transformArray.append(Double(transform.columns.0.y))
                    transformArray.append(Double(transform.columns.0.z))
                    transformArray.append(Double(transform.columns.0.w))
                    transformArray.append(Double(transform.columns.1.x))
                    transformArray.append(Double(transform.columns.1.y))
                    transformArray.append(Double(transform.columns.1.z))
                    transformArray.append(Double(transform.columns.1.w))
                    transformArray.append(Double(transform.columns.2.x))
                    transformArray.append(Double(transform.columns.2.y))
                    transformArray.append(Double(transform.columns.2.z))
                    transformArray.append(Double(transform.columns.2.w))
                    transformArray.append(Double(transform.columns.3.x))
                    transformArray.append(Double(transform.columns.3.y))
                    transformArray.append(Double(transform.columns.3.z))
                    transformArray.append(Double(transform.columns.3.w))

                    // Build intrinsics array separately
                    var intrinsicsArray: [Double] = []
                    intrinsicsArray.append(Double(intrinsics.columns.0.x))
                    intrinsicsArray.append(Double(intrinsics.columns.0.y))
                    intrinsicsArray.append(Double(intrinsics.columns.0.z))
                    intrinsicsArray.append(Double(intrinsics.columns.1.x))
                    intrinsicsArray.append(Double(intrinsics.columns.1.y))
                    intrinsicsArray.append(Double(intrinsics.columns.1.z))
                    intrinsicsArray.append(Double(intrinsics.columns.2.x))
                    intrinsicsArray.append(Double(intrinsics.columns.2.y))
                    intrinsicsArray.append(Double(intrinsics.columns.2.z))

                    let poseInfo: [String: Any] = [
                        "index": index,
                        "timestamp": photoData.timestamp,
                        "transform": transformArray,
                        "intrinsics": intrinsicsArray
                    ]
                    posesData.append(poseInfo)
                }

                // Save poses JSON
                let posesJsonData = try JSONSerialization.data(withJSONObject: posesData, options: .prettyPrinted)
                try posesJsonData.write(to: posesURL)

                print("Saved \(capturedPhotos.count) photos with camera poses to \(photosFolder.path)")
            }

            return [
                "scanId": scanId,
                "modelPath": modelURL.path,
                "photoCount": capturedPhotos.count,
                "hasPoses": !capturedPhotos.isEmpty
            ]
        } catch {
            print("Failed to export USDZ: \(error)")
            return nil
        }
    }

    private func cleanup() {
        roomCaptureView = nil
        scanViewController = nil
        roomDelegate = nil
        capturedRoom = nil
        capturedPhotos.removeAll()
        photoCount = 0

        // Clean up ultra-wide camera
        ultraWideCaptureSession?.stopRunning()
        ultraWideCaptureSession = nil
        ultraWidePhotoOutput = nil
        ultraWideCameraDevice = nil
        lastUltraWideImage = nil
        ultraWideIntrinsics = nil

        // Reset tracking variables
        lastCaptureTransform = nil
        lastCaptureTime = 0
        previousFrameTime = 0
        previousFrameTransform = nil

        // Clear UI references
        steadyIndicatorView = nil
        steadyLabel = nil
        photoCountLabel = nil
        isDeviceSteady = false
    }

    private func extractRoomData(from room: CapturedRoom) -> [String: Any] {
        var walls: [[String: Any]] = []
        var floors: [[String: Any]] = []
        var doors: [[String: Any]] = []
        var windows: [[String: Any]] = []
        var openings: [[String: Any]] = []

        // Extract walls with transform data for floor plan generation
        for wall in room.walls {
            let dimensions = wall.dimensions
            let transform = wall.transform

            // Get wall center position in world coordinates
            let centerX = Double(transform.columns.3.x)
            let centerZ = Double(transform.columns.3.z)

            // Get wall orientation from transform
            let angle = Double(atan2(transform.columns.0.z, transform.columns.0.x))

            // Calculate wall endpoints for 2D floor plan
            let halfWidth = Double(dimensions.x) / 2
            let startX = centerX - cos(angle) * halfWidth
            let startZ = centerZ - sin(angle) * halfWidth
            let endX = centerX + cos(angle) * halfWidth
            let endZ = centerZ + sin(angle) * halfWidth

            walls.append([
                "width": Double(dimensions.x),
                "height": Double(dimensions.y),
                "depth": Double(dimensions.z),
                "area": Double(dimensions.x * dimensions.y),
                "category": "wall",
                // Position data for floor plan
                "centerX": centerX,
                "centerZ": centerZ,
                "startX": startX,
                "startZ": startZ,
                "endX": endX,
                "endZ": endZ,
                "angle": angle
            ])
        }

        // Extract floors - only available on iOS 17+
        if #available(iOS 17.0, *) {
            for floor in room.floors {
                let dimensions = floor.dimensions
                floors.append([
                    "width": Double(dimensions.x),
                    "length": Double(dimensions.z),
                    "area": Double(dimensions.x * dimensions.z),
                    "category": "floor"
                ])
            }
        } else {
            // Estimate floor area from wall area on iOS 16
            let totalWallArea = walls.reduce(0.0) { $0 + ($1["area"] as? Double ?? 0) }

            var avgHeight: Double = 2.4
            if !walls.isEmpty {
                let totalHeight = walls.reduce(0.0) { $0 + ($1["height"] as? Double ?? 2.4) }
                avgHeight = totalHeight / Double(walls.count)
            }

            let estimatedPerimeter = totalWallArea / avgHeight
            let estimatedSide = estimatedPerimeter / 4
            let estimatedFloorArea = estimatedSide * estimatedSide

            if estimatedFloorArea > 0 {
                floors.append([
                    "width": estimatedSide,
                    "length": estimatedSide,
                    "area": estimatedFloorArea,
                    "category": "floor",
                    "estimated": true
                ])
            }
        }

        // Extract doors with transform data
        for door in room.doors {
            let dimensions = door.dimensions
            let transform = door.transform
            let angle = Double(atan2(transform.columns.0.z, transform.columns.0.x))

            doors.append([
                "width": Double(dimensions.x),
                "height": Double(dimensions.y),
                "category": "door",
                "centerX": Double(transform.columns.3.x),
                "centerZ": Double(transform.columns.3.z),
                "angle": angle
            ])
        }

        // Extract windows with transform data
        for window in room.windows {
            let dimensions = window.dimensions
            let transform = window.transform
            let angle = Double(atan2(transform.columns.0.z, transform.columns.0.x))

            windows.append([
                "width": Double(dimensions.x),
                "height": Double(dimensions.y),
                "category": "window",
                "centerX": Double(transform.columns.3.x),
                "centerZ": Double(transform.columns.3.z),
                "angle": angle
            ])
        }

        // Extract openings with transform data
        for opening in room.openings {
            let dimensions = opening.dimensions
            let transform = opening.transform
            let angle = Double(atan2(transform.columns.0.z, transform.columns.0.x))

            openings.append([
                "width": Double(dimensions.x),
                "height": Double(dimensions.y),
                "category": "opening",
                "centerX": Double(transform.columns.3.x),
                "centerZ": Double(transform.columns.3.z),
                "angle": angle
            ])
        }

        // Extract objects/furniture with transform data
        var objects: [[String: Any]] = []
        print("extractRoomData: Found \(room.objects.count) objects in CapturedRoom")
        for object in room.objects {
            let dimensions = object.dimensions
            let transform = object.transform
            let angle = Double(atan2(transform.columns.0.z, transform.columns.0.x))

            // Get the object category name
            let categoryName = objectCategoryName(object.category)
            print("extractRoomData: Adding object '\(categoryName)' - dimensions: \(dimensions)")

            objects.append([
                "width": Double(dimensions.x),
                "height": Double(dimensions.y),
                "depth": Double(dimensions.z),
                "category": categoryName,
                "centerX": Double(transform.columns.3.x),
                "centerY": Double(transform.columns.3.y),
                "centerZ": Double(transform.columns.3.z),
                "angle": angle
            ])
        }

        // Calculate totals
        let totalWallArea = walls.reduce(0.0) { $0 + ($1["area"] as? Double ?? 0) }
        let totalFloorArea = floors.reduce(0.0) { $0 + ($1["area"] as? Double ?? 0) }

        return [
            "success": true,
            "walls": walls,
            "floors": floors,
            "doors": doors,
            "windows": windows,
            "openings": openings,
            "objects": objects,
            "summary": [
                "wallCount": walls.count,
                "floorCount": floors.count,
                "doorCount": doors.count,
                "windowCount": windows.count,
                "openingCount": openings.count,
                "objectCount": objects.count,
                "totalWallAreaSqFt": totalWallArea * 10.764,
                "totalFloorAreaSqFt": totalFloorArea * 10.764,
                "totalWallAreaSqM": totalWallArea,
                "totalFloorAreaSqM": totalFloorArea
            ],
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
    }

    // Helper to convert CapturedRoom.Object.Category to string
    private func objectCategoryName(_ category: CapturedRoom.Object.Category) -> String {
        switch category {
        case .storage:
            return "storage"
        case .refrigerator:
            return "refrigerator"
        case .stove:
            return "stove"
        case .bed:
            return "bed"
        case .sink:
            return "sink"
        case .washerDryer:
            return "washerDryer"
        case .toilet:
            return "toilet"
        case .bathtub:
            return "bathtub"
        case .oven:
            return "oven"
        case .dishwasher:
            return "dishwasher"
        case .table:
            return "table"
        case .sofa:
            return "sofa"
        case .chair:
            return "chair"
        case .fireplace:
            return "fireplace"
        case .television:
            return "television"
        case .stairs:
            return "stairs"
        @unknown default:
            return "unknown"
        }
    }
}

// MARK: - Room Delegate

@available(iOS 16.0, *)
class RoomDelegate: NSObject, RoomCaptureViewDelegate, RoomCaptureSessionDelegate, NSCoding {

    private var completion: ((Result<CapturedRoom, Error>) -> Void)?

    init(completion: @escaping (Result<CapturedRoom, Error>) -> Void) {
        self.completion = completion
        super.init()
    }

    // NSCoding
    func encode(with coder: NSCoder) {}
    required init?(coder: NSCoder) {
        self.completion = nil
        super.init()
    }

    // RoomCaptureViewDelegate
    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: (any Error)?) -> Bool {
        return true
    }

    func captureView(didPresent processedResult: CapturedRoom, error: (any Error)?) {
        if let error = error {
            completion?(.failure(error))
        } else {
            completion?(.success(processedResult))
        }
    }

    // RoomCaptureSessionDelegate
    func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {}
    func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: (any Error)?) {}
}

// MARK: - Ultra-Wide Photo Capture Delegate

class UltraWidePhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    private let completion: (UIImage?) -> Void

    init(completion: @escaping (UIImage?) -> Void) {
        self.completion = completion
        super.init()
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            print("Ultra-wide photo capture error: \(error)")
            completion(nil)
            return
        }

        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            completion(nil)
            return
        }

        completion(image)
    }
}
#endif
