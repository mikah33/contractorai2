import Foundation
import UIKit
import PDFKit

#if canImport(RoomPlan)
import RoomPlan
#endif

// MARK: - CGPoint Extension

extension CGPoint {
    static func - (lhs: CGPoint, rhs: CGPoint) -> CGPoint {
        return CGPoint(x: lhs.x - rhs.x, y: lhs.y - rhs.y)
    }
}

// MARK: - Floor Plan Data Structures

struct FloorPlanData {
    var walls: [FloorPlanWall]
    var doors: [FloorPlanDoor]
    var windows: [FloorPlanWindow]
    var openings: [FloorPlanOpening]
    var rooms: [FloorPlanRoom]
    var objects: [FloorPlanObject]
    var annotations: [FloorPlanAnnotation]
    var totalArea: Float // in square feet
    var boundingBox: CGRect
    var ceilingHeight: Float // in feet (average)
    var roomName: String? // User-assigned name
}

struct FloorPlanAnnotation {
    var position: CGPoint
    var text: String
    var type: AnnotationType

    enum AnnotationType: String {
        case note = "note"
        case measurement = "measurement"
        case repair = "repair"
        case electrical = "electrical"
        case plumbing = "plumbing"
    }
}

struct FloorPlanWall {
    var startPoint: CGPoint
    var endPoint: CGPoint
    var thickness: CGFloat
    var length: Float // in feet
    var height: Float // in feet
}

struct FloorPlanDoor {
    var position: CGPoint
    var width: Float // in feet
    var rotation: CGFloat // radians
    var swingDirection: DoorSwing

    enum DoorSwing {
        case left, right, double
    }
}

struct FloorPlanWindow {
    var position: CGPoint
    var width: Float // in feet
    var rotation: CGFloat
}

struct FloorPlanOpening {
    var position: CGPoint
    var width: Float
    var rotation: CGFloat
}

struct FloorPlanRoom {
    var corners: [CGPoint]
    var center: CGPoint
    var area: Float // in square feet
    var label: String
}

struct FloorPlanObject {
    var position: CGPoint
    var width: Float // in feet
    var depth: Float // in feet
    var rotation: CGFloat
    var category: String
}

// MARK: - Floor Plan Generator

@available(iOS 16.0, *)
class FloorPlanGenerator {

    // Conversion: meters to feet
    private let metersToFeet: Float = 3.28084

    // Drawing scale (pixels per foot)
    private var scale: CGFloat = 20.0

    // Canvas size
    private var canvasSize: CGSize = CGSize(width: 1200, height: 900)

    // Style settings
    private let wallColor = UIColor.black
    private let wallThickness: CGFloat = 4.0
    private let doorColor = UIColor(red: 0.4, green: 0.3, blue: 0.2, alpha: 1.0)
    private let windowColor = UIColor(red: 0.3, green: 0.6, blue: 0.9, alpha: 1.0)
    private let dimensionColor = UIColor.darkGray
    private let roomFillColor = UIColor(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0)
    private let gridColor = UIColor(red: 0.9, green: 0.9, blue: 0.9, alpha: 1.0)

    // MARK: - Generate Floor Plan from CapturedRoom

    #if canImport(RoomPlan)
    func generateFloorPlan(from room: CapturedRoom) -> FloorPlanData {
        var walls: [FloorPlanWall] = []
        var doors: [FloorPlanDoor] = []
        var windows: [FloorPlanWindow] = []
        var openings: [FloorPlanOpening] = []

        // Convert walls to 2D
        for wall in room.walls {
            let transform = wall.transform
            let dimensions = wall.dimensions

            // Get wall center position in world coordinates
            let centerX = transform.columns.3.x
            let centerZ = transform.columns.3.z

            // Get wall orientation from transform
            let angle = atan2(transform.columns.0.z, transform.columns.0.x)

            // Calculate wall endpoints
            let halfWidth = dimensions.x / 2
            let startX = centerX - cos(angle) * halfWidth
            let startZ = centerZ - sin(angle) * halfWidth
            let endX = centerX + cos(angle) * halfWidth
            let endZ = centerZ + sin(angle) * halfWidth

            walls.append(FloorPlanWall(
                startPoint: CGPoint(x: CGFloat(startX), y: CGFloat(startZ)),
                endPoint: CGPoint(x: CGFloat(endX), y: CGFloat(endZ)),
                thickness: CGFloat(dimensions.z) * scale,
                length: dimensions.x * metersToFeet,
                height: dimensions.y * metersToFeet
            ))
        }

        // Convert doors to 2D
        for door in room.doors {
            let transform = door.transform
            let dimensions = door.dimensions
            let angle = atan2(transform.columns.0.z, transform.columns.0.x)

            doors.append(FloorPlanDoor(
                position: CGPoint(x: CGFloat(transform.columns.3.x), y: CGFloat(transform.columns.3.z)),
                width: dimensions.x * metersToFeet,
                rotation: CGFloat(angle),
                swingDirection: .right
            ))
        }

        // Convert windows to 2D
        for window in room.windows {
            let transform = window.transform
            let dimensions = window.dimensions
            let angle = atan2(transform.columns.0.z, transform.columns.0.x)

            windows.append(FloorPlanWindow(
                position: CGPoint(x: CGFloat(transform.columns.3.x), y: CGFloat(transform.columns.3.z)),
                width: dimensions.x * metersToFeet,
                rotation: CGFloat(angle)
            ))
        }

        // Convert openings to 2D
        for opening in room.openings {
            let transform = opening.transform
            let dimensions = opening.dimensions
            let angle = atan2(transform.columns.0.z, transform.columns.0.x)

            openings.append(FloorPlanOpening(
                position: CGPoint(x: CGFloat(transform.columns.3.x), y: CGFloat(transform.columns.3.z)),
                width: dimensions.x * metersToFeet,
                rotation: CGFloat(angle)
            ))
        }

        // Calculate bounding box
        let boundingBox = calculateBoundingBox(walls: walls)

        // Calculate total area
        var totalArea: Float = 0
        if #available(iOS 17.0, *) {
            for floor in room.floors {
                totalArea += floor.dimensions.x * floor.dimensions.z * metersToFeet * metersToFeet
            }
        }

        // If no floors detected, estimate from walls
        if totalArea == 0 {
            totalArea = Float(boundingBox.width * boundingBox.height) * metersToFeet * metersToFeet
        }

        // Create room from walls (simplified - single room)
        let rooms = [FloorPlanRoom(
            corners: walls.map { $0.startPoint },
            center: CGPoint(x: boundingBox.midX, y: boundingBox.midY),
            area: totalArea,
            label: "Room"
        )]

        // Extract objects/furniture
        var objects: [FloorPlanObject] = []
        for object in room.objects {
            let transform = object.transform
            let dimensions = object.dimensions
            let angle = atan2(transform.columns.0.z, transform.columns.0.x)

            objects.append(FloorPlanObject(
                position: CGPoint(x: CGFloat(transform.columns.3.x), y: CGFloat(transform.columns.3.z)),
                width: dimensions.x * metersToFeet,
                depth: dimensions.z * metersToFeet,
                rotation: CGFloat(angle),
                category: objectCategoryName(object.category)
            ))
        }

        // Calculate average ceiling height from wall heights
        let avgCeilingHeight = walls.isEmpty ? 8.0 : walls.reduce(0.0) { $0 + Float($1.height) } / Float(walls.count)

        return FloorPlanData(
            walls: walls,
            doors: doors,
            windows: windows,
            openings: openings,
            rooms: rooms,
            objects: objects,
            annotations: [],
            totalArea: totalArea,
            boundingBox: boundingBox,
            ceilingHeight: avgCeilingHeight,
            roomName: nil
        )
    }

    // Helper to convert CapturedRoom.Object.Category to string
    private func objectCategoryName(_ category: CapturedRoom.Object.Category) -> String {
        switch category {
        case .storage: return "storage"
        case .refrigerator: return "refrigerator"
        case .stove: return "stove"
        case .bed: return "bed"
        case .sink: return "sink"
        case .washerDryer: return "washerDryer"
        case .toilet: return "toilet"
        case .bathtub: return "bathtub"
        case .oven: return "oven"
        case .dishwasher: return "dishwasher"
        case .table: return "table"
        case .sofa: return "sofa"
        case .chair: return "chair"
        case .fireplace: return "fireplace"
        case .television: return "television"
        case .stairs: return "stairs"
        @unknown default: return "unknown"
        }
    }
    #endif

    // MARK: - Generate from scan data dictionary

    func generateFloorPlan(from scanData: [String: Any]) -> FloorPlanData? {
        // Get summary data
        var totalFloorArea: Double = 0
        var totalWallArea: Double = 0

        if let summary = scanData["summary"] as? [String: Any] {
            totalFloorArea = summary["totalFloorAreaSqFt"] as? Double ?? 0
            totalWallArea = summary["totalWallAreaSqFt"] as? Double ?? 0
            print("FloorPlanGenerator: Got summary - floor: \(totalFloorArea) sq ft, walls: \(totalWallArea) sq ft")
        }

        var walls: [FloorPlanWall] = []
        var doors: [FloorPlanDoor] = []
        var windows: [FloorPlanWindow] = []
        var openings: [FloorPlanOpening] = []

        // Check if we have actual wall position data (new format with transforms)
        var hasPositionData = false
        if let wallsData = scanData["walls"] as? [[String: Any]], !wallsData.isEmpty {
            if let firstWall = wallsData.first, firstWall["startX"] != nil {
                hasPositionData = true
            }
        }

        print("FloorPlanGenerator: Has position data: \(hasPositionData)")

        if hasPositionData {
            // Use actual wall positions from the scan
            var rawWalls: [FloorPlanWall] = []
            if let wallsData = scanData["walls"] as? [[String: Any]] {
                for wallData in wallsData {
                    let startX = wallData["startX"] as? Double ?? 0
                    let startZ = wallData["startZ"] as? Double ?? 0
                    let endX = wallData["endX"] as? Double ?? 0
                    let endZ = wallData["endZ"] as? Double ?? 0
                    let width = wallData["width"] as? Double ?? 1.0
                    let height = wallData["height"] as? Double ?? 2.4
                    let depth = wallData["depth"] as? Double ?? 0.1

                    rawWalls.append(FloorPlanWall(
                        startPoint: CGPoint(x: CGFloat(startX), y: CGFloat(startZ)),
                        endPoint: CGPoint(x: CGFloat(endX), y: CGFloat(endZ)),
                        thickness: CGFloat(depth) * scale,
                        length: Float(width) * metersToFeet,
                        height: Float(height) * metersToFeet
                    ))
                }

                // Deduplicate walls that are very close together and parallel
                walls = deduplicateWalls(rawWalls)
                print("FloorPlanGenerator: Created \(walls.count) walls from \(rawWalls.count) raw walls (deduplicated)")
            }

            // Use actual door positions
            if let doorsData = scanData["doors"] as? [[String: Any]] {
                for doorData in doorsData {
                    let centerX = doorData["centerX"] as? Double ?? 0
                    let centerZ = doorData["centerZ"] as? Double ?? 0
                    let width = doorData["width"] as? Double ?? 0.9
                    let angle = doorData["angle"] as? Double ?? 0

                    doors.append(FloorPlanDoor(
                        position: CGPoint(x: CGFloat(centerX), y: CGFloat(centerZ)),
                        width: Float(width) * metersToFeet,
                        rotation: CGFloat(angle),
                        swingDirection: .right
                    ))
                }
                print("FloorPlanGenerator: Created \(doors.count) doors from position data")
            }

            // Use actual window positions
            if let windowsData = scanData["windows"] as? [[String: Any]] {
                for windowData in windowsData {
                    let centerX = windowData["centerX"] as? Double ?? 0
                    let centerZ = windowData["centerZ"] as? Double ?? 0
                    let width = windowData["width"] as? Double ?? 1.2
                    let angle = windowData["angle"] as? Double ?? 0

                    windows.append(FloorPlanWindow(
                        position: CGPoint(x: CGFloat(centerX), y: CGFloat(centerZ)),
                        width: Float(width) * metersToFeet,
                        rotation: CGFloat(angle)
                    ))
                }
                print("FloorPlanGenerator: Created \(windows.count) windows from position data")
            }

            // Use actual opening positions
            if let openingsData = scanData["openings"] as? [[String: Any]] {
                for openingData in openingsData {
                    let centerX = openingData["centerX"] as? Double ?? 0
                    let centerZ = openingData["centerZ"] as? Double ?? 0
                    let width = openingData["width"] as? Double ?? 1.0
                    let angle = openingData["angle"] as? Double ?? 0

                    openings.append(FloorPlanOpening(
                        position: CGPoint(x: CGFloat(centerX), y: CGFloat(centerZ)),
                        width: Float(width) * metersToFeet,
                        rotation: CGFloat(angle)
                    ))
                }
            }

            // Use actual object/furniture positions
            var objects: [FloorPlanObject] = []
            if let objectsData = scanData["objects"] as? [[String: Any]] {
                print("FloorPlanGenerator: Found \(objectsData.count) objects in scan data")
                for objectData in objectsData {
                    let centerX = objectData["centerX"] as? Double ?? 0
                    let centerZ = objectData["centerZ"] as? Double ?? 0
                    let width = objectData["width"] as? Double ?? 1.0
                    let depth = objectData["depth"] as? Double ?? 1.0
                    let angle = objectData["angle"] as? Double ?? 0
                    let category = objectData["category"] as? String ?? "unknown"

                    print("FloorPlanGenerator: Adding object '\(category)' at (\(centerX), \(centerZ))")

                    objects.append(FloorPlanObject(
                        position: CGPoint(x: CGFloat(centerX), y: CGFloat(centerZ)),
                        width: Float(width) * metersToFeet,
                        depth: Float(depth) * metersToFeet,
                        rotation: CGFloat(angle),
                        category: category
                    ))
                }
                print("FloorPlanGenerator: Created \(objects.count) objects from position data")
            } else {
                print("FloorPlanGenerator: No objects found in scan data - keys: \(scanData.keys)")
            }

            // Calculate bounding box from actual walls
            let boundingBox = calculateBoundingBox(walls: walls)

            // Calculate total area if not provided
            if totalFloorArea == 0 {
                totalFloorArea = Double(boundingBox.width * boundingBox.height) * Double(metersToFeet) * Double(metersToFeet)
            }

            // Create ordered room polygon from wall endpoints
            let orderedCorners = createOrderedPolygon(from: walls)

            print("FloorPlanGenerator: Generated floor plan from actual geometry - area: \(totalFloorArea) sq ft, corners: \(orderedCorners.count)")

            // Calculate average ceiling height from wall heights
            let avgCeilingHeight = walls.isEmpty ? 8.0 : Double(walls.reduce(0.0) { $0 + $1.height } / Float(walls.count))

            return FloorPlanData(
                walls: walls,
                doors: doors,
                windows: windows,
                openings: openings,
                rooms: [FloorPlanRoom(
                    corners: orderedCorners,
                    center: CGPoint(x: boundingBox.midX, y: boundingBox.midY),
                    area: Float(totalFloorArea),
                    label: "Room"
                )],
                objects: objects,
                annotations: [],
                totalArea: Float(totalFloorArea),
                boundingBox: boundingBox,
                ceilingHeight: Float(avgCeilingHeight),
                roomName: nil
            )
        } else {
            // Fallback: Create estimated rectangular room from area
            print("FloorPlanGenerator: Using fallback rectangular estimation")

            // Calculate floor area from various sources
            if totalFloorArea == 0, let floorsData = scanData["floors"] as? [[String: Any]] {
                for floor in floorsData {
                    let area = floor["area"] as? Double ?? 0
                    totalFloorArea += area * 10.764 // Convert sq meters to sq ft
                }
            }

            if totalFloorArea == 0, let wallsData = scanData["walls"] as? [[String: Any]] {
                var wallArea: Double = 0
                var avgHeight: Double = 2.4
                for wall in wallsData {
                    wallArea += wall["area"] as? Double ?? 0
                    avgHeight = wall["height"] as? Double ?? 2.4
                }
                let perimeter = wallArea / avgHeight
                let side = perimeter / 4
                totalFloorArea = side * side * 10.764
            }

            if totalFloorArea < 10 {
                totalFloorArea = 100
            }

            // Get counts
            var doorCount = 0
            var windowCount = 0
            if let doorsData = scanData["doors"] as? [[String: Any]] {
                doorCount = doorsData.count
            }
            if let windowsData = scanData["windows"] as? [[String: Any]] {
                windowCount = windowsData.count
            }

            let roomSide = sqrt(totalFloorArea)
            let halfSide = CGFloat(roomSide) / 2

            // Create rectangular walls
            walls = [
                FloorPlanWall(startPoint: CGPoint(x: -halfSide, y: -halfSide), endPoint: CGPoint(x: halfSide, y: -halfSide), thickness: 4, length: Float(roomSide), height: 8),
                FloorPlanWall(startPoint: CGPoint(x: halfSide, y: -halfSide), endPoint: CGPoint(x: halfSide, y: halfSide), thickness: 4, length: Float(roomSide), height: 8),
                FloorPlanWall(startPoint: CGPoint(x: halfSide, y: halfSide), endPoint: CGPoint(x: -halfSide, y: halfSide), thickness: 4, length: Float(roomSide), height: 8),
                FloorPlanWall(startPoint: CGPoint(x: -halfSide, y: halfSide), endPoint: CGPoint(x: -halfSide, y: -halfSide), thickness: 4, length: Float(roomSide), height: 8)
            ]

            // Add doors evenly spaced
            for i in 0..<doorCount {
                let spacing = roomSide / CGFloat(doorCount + 1)
                let xPos = -halfSide + CGFloat(i + 1) * spacing
                doors.append(FloorPlanDoor(
                    position: CGPoint(x: xPos, y: -halfSide),
                    width: 3.0,
                    rotation: 0,
                    swingDirection: .right
                ))
            }

            // Add windows evenly spaced
            for i in 0..<windowCount {
                let spacing = roomSide / CGFloat(windowCount + 1)
                let xPos = -halfSide + CGFloat(i + 1) * spacing
                windows.append(FloorPlanWindow(
                    position: CGPoint(x: xPos, y: halfSide),
                    width: 4.0,
                    rotation: .pi
                ))
            }

            let boundingBox = CGRect(x: -halfSide, y: -halfSide, width: CGFloat(roomSide), height: CGFloat(roomSide))

            print("FloorPlanGenerator: Generated estimated floor plan - area: \(totalFloorArea) sq ft")

            return FloorPlanData(
                walls: walls,
                doors: doors,
                windows: windows,
                openings: openings,
                rooms: [FloorPlanRoom(
                    corners: [CGPoint(x: -halfSide, y: -halfSide), CGPoint(x: halfSide, y: -halfSide), CGPoint(x: halfSide, y: halfSide), CGPoint(x: -halfSide, y: halfSide)],
                    center: CGPoint(x: 0, y: 0),
                    area: Float(totalFloorArea),
                    label: "Room"
                )],
                objects: [], // No objects in fallback mode
                annotations: [],
                totalArea: Float(totalFloorArea),
                boundingBox: boundingBox,
                ceilingHeight: 8.0, // Default 8 ft ceiling for estimated rooms
                roomName: nil
            )
        }
    }

    // MARK: - Render Floor Plan to Image

    func renderFloorPlan(_ floorPlan: FloorPlanData, size: CGSize? = nil, showMeasurements: Bool = true, showGrid: Bool = true, showObjects: Bool = false) -> UIImage? {
        let renderSize = size ?? canvasSize

        // Calculate scale to fit floor plan in canvas with padding
        let padding: CGFloat = 100
        let availableWidth = renderSize.width - padding * 2
        let availableHeight = renderSize.height - padding * 2

        let scaleX = availableWidth / floorPlan.boundingBox.width
        let scaleY = availableHeight / floorPlan.boundingBox.height
        scale = min(scaleX, scaleY) * 0.8 // 80% to leave room for labels

        // Offset to center the floor plan
        let offsetX = renderSize.width / 2 - floorPlan.boundingBox.midX * scale
        let offsetY = renderSize.height / 2 - floorPlan.boundingBox.midY * scale

        UIGraphicsBeginImageContextWithOptions(renderSize, true, 2.0)
        guard let context = UIGraphicsGetCurrentContext() else { return nil }

        // White background
        UIColor.white.setFill()
        context.fill(CGRect(origin: .zero, size: renderSize))

        // Draw grid if enabled
        if showGrid {
            drawGrid(context: context, size: renderSize, offset: CGPoint(x: offsetX, y: offsetY))
        }

        // Transform to floor plan coordinates
        context.translateBy(x: offsetX, y: offsetY)
        context.scaleBy(x: scale, y: scale)

        // Draw room fill
        for room in floorPlan.rooms {
            drawRoomFill(context: context, room: room)
        }

        // Draw objects/furniture if enabled (before walls so they appear behind)
        if showObjects {
            print("FloorPlanGenerator: Drawing \(floorPlan.objects.count) objects (showObjects=true)")
            for object in floorPlan.objects {
                // Skip objects that are likely misdetections near doors
                if shouldSkipObject(object: object, doors: floorPlan.doors) {
                    print("FloorPlanGenerator: Skipping object '\(object.category)' at \(object.position) - too close to door")
                    continue
                }
                print("FloorPlanGenerator: Drawing object '\(object.category)' at \(object.position)")
                drawObject(context: context, object: object)
            }
        } else {
            print("FloorPlanGenerator: Skipping objects rendering (showObjects=false), have \(floorPlan.objects.count) objects")
        }

        // Draw walls
        for wall in floorPlan.walls {
            drawWall(context: context, wall: wall)
        }

        // Draw doors
        for door in floorPlan.doors {
            drawDoor(context: context, door: door)
        }

        // Draw windows
        for window in floorPlan.windows {
            drawWindow(context: context, window: window)
        }

        // Draw openings
        for opening in floorPlan.openings {
            drawOpening(context: context, opening: opening)
        }

        // Reset transform for measurements and labels
        context.scaleBy(x: 1/scale, y: 1/scale)
        context.translateBy(x: -offsetX, y: -offsetY)

        // Draw measurements
        if showMeasurements {
            drawMeasurements(context: context, floorPlan: floorPlan, offset: CGPoint(x: offsetX, y: offsetY))
        }

        // Draw object labels if enabled
        if showObjects && !floorPlan.objects.isEmpty {
            drawObjectLabels(context: context, floorPlan: floorPlan, offset: CGPoint(x: offsetX, y: offsetY))
        }

        // Draw title and area
        drawTitleAndInfo(context: context, floorPlan: floorPlan, size: renderSize)

        // Draw scale indicator
        drawScaleIndicator(context: context, size: renderSize)

        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return image
    }

    // MARK: - Drawing Methods

    private func drawGrid(context: CGContext, size: CGSize, offset: CGPoint) {
        context.setStrokeColor(gridColor.cgColor)
        context.setLineWidth(0.5)

        let gridSpacing: CGFloat = scale // 1 foot grid

        // Vertical lines
        var x = offset.x.truncatingRemainder(dividingBy: gridSpacing)
        while x < size.width {
            context.move(to: CGPoint(x: x, y: 0))
            context.addLine(to: CGPoint(x: x, y: size.height))
            x += gridSpacing
        }

        // Horizontal lines
        var y = offset.y.truncatingRemainder(dividingBy: gridSpacing)
        while y < size.height {
            context.move(to: CGPoint(x: 0, y: y))
            context.addLine(to: CGPoint(x: size.width, y: y))
            y += gridSpacing
        }

        context.strokePath()
    }

    private func drawRoomFill(context: CGContext, room: FloorPlanRoom) {
        guard room.corners.count >= 3 else { return }

        context.setFillColor(roomFillColor.cgColor)
        context.move(to: room.corners[0])
        for corner in room.corners.dropFirst() {
            context.addLine(to: corner)
        }
        context.closePath()
        context.fillPath()
    }

    private func drawWall(context: CGContext, wall: FloorPlanWall) {
        context.setStrokeColor(wallColor.cgColor)
        context.setLineWidth(wallThickness / scale)
        context.setLineCap(.round)
        context.setLineJoin(.round)

        context.move(to: wall.startPoint)
        context.addLine(to: wall.endPoint)
        context.strokePath()
    }

    private func drawDoor(context: CGContext, door: FloorPlanDoor) {
        let doorWidth = CGFloat(door.width) / CGFloat(metersToFeet)

        context.saveGState()
        context.translateBy(x: door.position.x, y: door.position.y)
        context.rotate(by: door.rotation)

        // Door opening (gap in wall)
        context.setStrokeColor(UIColor.white.cgColor)
        context.setLineWidth(wallThickness / scale + 2)
        context.move(to: CGPoint(x: -doorWidth/2, y: 0))
        context.addLine(to: CGPoint(x: doorWidth/2, y: 0))
        context.strokePath()

        // Door swing arc
        context.setStrokeColor(doorColor.cgColor)
        context.setLineWidth(1.5 / scale)
        context.addArc(center: CGPoint(x: -doorWidth/2, y: 0), radius: doorWidth, startAngle: 0, endAngle: .pi/2, clockwise: false)
        context.strokePath()

        // Door leaf (line)
        context.setLineWidth(2 / scale)
        context.move(to: CGPoint(x: -doorWidth/2, y: 0))
        context.addLine(to: CGPoint(x: -doorWidth/2, y: doorWidth))
        context.strokePath()

        context.restoreGState()
    }

    private func drawWindow(context: CGContext, window: FloorPlanWindow) {
        let windowWidth = CGFloat(window.width) / CGFloat(metersToFeet)

        context.saveGState()
        context.translateBy(x: window.position.x, y: window.position.y)
        context.rotate(by: window.rotation)

        // Window (three parallel lines)
        context.setStrokeColor(windowColor.cgColor)
        context.setLineWidth(2 / scale)

        let offsets: [CGFloat] = [-2/scale, 0, 2/scale]
        for offset in offsets {
            context.move(to: CGPoint(x: -windowWidth/2, y: offset))
            context.addLine(to: CGPoint(x: windowWidth/2, y: offset))
        }
        context.strokePath()

        context.restoreGState()
    }

    private func drawOpening(context: CGContext, opening: FloorPlanOpening) {
        let openingWidth = CGFloat(opening.width) / CGFloat(metersToFeet)

        context.saveGState()
        context.translateBy(x: opening.position.x, y: opening.position.y)
        context.rotate(by: opening.rotation)

        // Opening (dashed line)
        context.setStrokeColor(UIColor.gray.cgColor)
        context.setLineWidth(1 / scale)
        context.setLineDash(phase: 0, lengths: [4/scale, 4/scale])

        context.move(to: CGPoint(x: -openingWidth/2, y: 0))
        context.addLine(to: CGPoint(x: openingWidth/2, y: 0))
        context.strokePath()

        context.setLineDash(phase: 0, lengths: [])
        context.restoreGState()
    }

    private func drawObject(context: CGContext, object: FloorPlanObject) {
        let objectWidth = CGFloat(object.width) / CGFloat(metersToFeet)
        let objectDepth = CGFloat(object.depth) / CGFloat(metersToFeet)

        context.saveGState()
        context.translateBy(x: object.position.x, y: object.position.y)
        context.rotate(by: object.rotation)

        // Get color based on category
        let fillColor = objectFillColor(for: object.category)
        let strokeColor = objectStrokeColor(for: object.category)

        // Draw object as a rectangle
        let rect = CGRect(x: -objectWidth/2, y: -objectDepth/2, width: objectWidth, height: objectDepth)

        context.setFillColor(fillColor.cgColor)
        context.fill(rect)

        context.setStrokeColor(strokeColor.cgColor)
        context.setLineWidth(1.5 / scale)
        context.stroke(rect)

        // Draw icon/symbol based on category
        drawObjectSymbol(context: context, category: object.category, rect: rect)

        context.restoreGState()
    }

    private func objectFillColor(for category: String) -> UIColor {
        switch category {
        case "table":
            return UIColor(red: 0.76, green: 0.60, blue: 0.42, alpha: 0.5) // Brown
        case "chair":
            return UIColor(red: 0.76, green: 0.60, blue: 0.42, alpha: 0.4)
        case "sofa":
            return UIColor(red: 0.55, green: 0.55, blue: 0.80, alpha: 0.5) // Purple-ish
        case "bed":
            return UIColor(red: 0.70, green: 0.85, blue: 0.90, alpha: 0.5) // Light blue
        case "refrigerator", "stove", "oven", "dishwasher", "washerDryer":
            return UIColor(red: 0.85, green: 0.85, blue: 0.85, alpha: 0.7) // Gray (appliances)
        case "sink", "toilet", "bathtub":
            return UIColor(red: 0.70, green: 0.90, blue: 0.95, alpha: 0.5) // Light cyan (bathroom)
        case "television":
            return UIColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 0.7) // Dark gray
        case "storage":
            return UIColor(red: 0.90, green: 0.85, blue: 0.70, alpha: 0.5) // Tan
        case "fireplace":
            return UIColor(red: 0.80, green: 0.40, blue: 0.30, alpha: 0.5) // Reddish
        case "stairs":
            return UIColor(red: 0.70, green: 0.70, blue: 0.70, alpha: 0.5) // Medium gray
        default:
            return UIColor(red: 0.80, green: 0.80, blue: 0.80, alpha: 0.4)
        }
    }

    private func objectStrokeColor(for category: String) -> UIColor {
        switch category {
        case "refrigerator", "stove", "oven", "dishwasher", "washerDryer":
            return UIColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 1.0)
        case "sink", "toilet", "bathtub":
            return UIColor(red: 0.3, green: 0.6, blue: 0.7, alpha: 1.0)
        case "television":
            return UIColor.black
        default:
            return UIColor(red: 0.5, green: 0.4, blue: 0.3, alpha: 1.0)
        }
    }

    private func drawObjectSymbol(context: CGContext, category: String, rect: CGRect) {
        context.setStrokeColor(UIColor.darkGray.cgColor)
        context.setLineWidth(0.5 / scale)

        switch category {
        case "sink":
            // Draw oval for sink basin
            let ovalRect = rect.insetBy(dx: rect.width * 0.2, dy: rect.height * 0.2)
            context.strokeEllipse(in: ovalRect)
        case "toilet":
            // Draw toilet shape (circle + oval)
            let circleSize = min(rect.width, rect.height) * 0.4
            let circleRect = CGRect(x: rect.midX - circleSize/2, y: rect.minY + rect.height * 0.1, width: circleSize, height: circleSize)
            context.strokeEllipse(in: circleRect)
        case "bathtub":
            // Draw inner rectangle
            let innerRect = rect.insetBy(dx: rect.width * 0.1, dy: rect.height * 0.1)
            context.stroke(innerRect)
        case "bed":
            // Draw pillow area
            let pillowRect = CGRect(x: rect.minX + rect.width * 0.1, y: rect.minY + rect.height * 0.1, width: rect.width * 0.8, height: rect.height * 0.2)
            context.stroke(pillowRect)
        case "television":
            // Draw screen
            let screenRect = rect.insetBy(dx: rect.width * 0.05, dy: rect.height * 0.1)
            context.setFillColor(UIColor(white: 0.3, alpha: 1.0).cgColor)
            context.fill(screenRect)
        case "stairs":
            // Draw stair lines
            let stepCount = 4
            let stepHeight = rect.height / CGFloat(stepCount)
            for i in 0..<stepCount {
                let y = rect.minY + CGFloat(i) * stepHeight
                context.move(to: CGPoint(x: rect.minX, y: y))
                context.addLine(to: CGPoint(x: rect.maxX, y: y))
            }
            context.strokePath()
        default:
            break
        }
    }

    private func drawObjectLabels(context: CGContext, floorPlan: FloorPlanData, offset: CGPoint) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .medium),
            .foregroundColor: UIColor.darkGray
        ]

        for object in floorPlan.objects {
            // Skip objects that were filtered out in rendering
            if shouldSkipObject(object: object, doors: floorPlan.doors) {
                continue
            }

            let screenPoint = CGPoint(
                x: object.position.x * scale + offset.x,
                y: object.position.y * scale + offset.y
            )

            let label = objectDisplayName(object.category)
            let textSize = label.size(withAttributes: attributes)

            let textRect = CGRect(
                x: screenPoint.x - textSize.width/2,
                y: screenPoint.y - textSize.height/2,
                width: textSize.width,
                height: textSize.height
            )

            // Draw background
            context.setFillColor(UIColor.white.withAlphaComponent(0.7).cgColor)
            context.fill(textRect.insetBy(dx: -2, dy: -1))

            label.draw(in: textRect, withAttributes: attributes)
        }
    }

    private func objectDisplayName(_ category: String) -> String {
        switch category {
        case "washerDryer": return "W/D"
        case "refrigerator": return "Fridge"
        case "television": return "TV"
        case "dishwasher": return "D/W"
        default: return category.capitalized
        }
    }

    // Filter out objects that are likely misdetections (storage near doors, oversized objects)
    private func shouldSkipObject(object: FloorPlanObject, doors: [FloorPlanDoor]) -> Bool {
        // Skip storage objects that are very close to doors (likely door frame misdetection)
        if object.category == "storage" {
            for door in doors {
                let distance = hypot(object.position.x - door.position.x, object.position.y - door.position.y)
                // If storage is within 1.5 meters of a door, likely a misdetection
                let proximityThreshold: CGFloat = 1.5 / CGFloat(metersToFeet) // Convert to floor plan units
                if distance < proximityThreshold {
                    return true
                }
            }

            // Also skip very large "storage" objects (likely walls or room features misdetected)
            let objectArea = object.width * object.depth
            if objectArea > 2.0 { // More than 2 square meters is suspicious for storage
                return true
            }
        }

        return false
    }

    private func drawMeasurements(context: CGContext, floorPlan: FloorPlanData, offset: CGPoint) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
            .foregroundColor: dimensionColor
        ]

        // Draw wall measurements
        for wall in floorPlan.walls {
            let midPoint = CGPoint(
                x: (wall.startPoint.x + wall.endPoint.x) / 2 * scale + offset.x,
                y: (wall.startPoint.y + wall.endPoint.y) / 2 * scale + offset.y
            )

            let measurementText = String(format: "%.1f'", wall.length)
            let textSize = measurementText.size(withAttributes: attributes)

            // Calculate perpendicular offset for label
            let dx = wall.endPoint.x - wall.startPoint.x
            let dy = wall.endPoint.y - wall.startPoint.y
            let length = sqrt(dx*dx + dy*dy)
            let perpX = -dy / length * 20 // 20 points offset
            let perpY = dx / length * 20

            let textRect = CGRect(
                x: midPoint.x + perpX - textSize.width/2,
                y: midPoint.y + perpY - textSize.height/2,
                width: textSize.width,
                height: textSize.height
            )

            // Draw background
            context.setFillColor(UIColor.white.withAlphaComponent(0.8).cgColor)
            context.fill(textRect.insetBy(dx: -3, dy: -2))

            measurementText.draw(in: textRect, withAttributes: attributes)
        }
    }

    private func drawTitleAndInfo(context: CGContext, floorPlan: FloorPlanData, size: CGSize) {
        // Title
        let titleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: UIColor.black
        ]
        let title = floorPlan.roomName ?? "Floor Plan"
        title.draw(at: CGPoint(x: 30, y: 30), withAttributes: titleAttributes)

        // Area info
        let infoAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 16, weight: .medium),
            .foregroundColor: UIColor.darkGray
        ]
        let areaText = String(format: "Total Area: %.0f sq ft", floorPlan.totalArea)
        areaText.draw(at: CGPoint(x: 30, y: 60), withAttributes: infoAttributes)

        // Ceiling height info
        let ceilingText = String(format: "Ceiling Height: %.1f ft", floorPlan.ceilingHeight)
        ceilingText.draw(at: CGPoint(x: 30, y: 85), withAttributes: infoAttributes)

        // Room count info
        let roomsText = "Rooms: \(floorPlan.rooms.count) | Doors: \(floorPlan.doors.count) | Windows: \(floorPlan.windows.count)"
        roomsText.draw(at: CGPoint(x: 30, y: 110), withAttributes: infoAttributes)

        // Generated date
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        let dateText = "Generated: \(dateFormatter.string(from: Date()))"
        let dateAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12, weight: .regular),
            .foregroundColor: UIColor.gray
        ]
        dateText.draw(at: CGPoint(x: 30, y: size.height - 40), withAttributes: dateAttributes)

        // App branding
        let brandText = "ContractorAI"
        brandText.draw(at: CGPoint(x: size.width - 120, y: size.height - 40), withAttributes: dateAttributes)
    }

    private func drawScaleIndicator(context: CGContext, size: CGSize) {
        let scaleBarLength: CGFloat = 100
        let scaleBarY = size.height - 60
        let scaleBarX = size.width - 150

        // Calculate what distance the bar represents
        let distanceInFeet = scaleBarLength / scale

        // Draw scale bar
        context.setStrokeColor(UIColor.black.cgColor)
        context.setLineWidth(2)

        context.move(to: CGPoint(x: scaleBarX, y: scaleBarY))
        context.addLine(to: CGPoint(x: scaleBarX + scaleBarLength, y: scaleBarY))

        // End caps
        context.move(to: CGPoint(x: scaleBarX, y: scaleBarY - 5))
        context.addLine(to: CGPoint(x: scaleBarX, y: scaleBarY + 5))
        context.move(to: CGPoint(x: scaleBarX + scaleBarLength, y: scaleBarY - 5))
        context.addLine(to: CGPoint(x: scaleBarX + scaleBarLength, y: scaleBarY + 5))

        context.strokePath()

        // Scale label
        let scaleAttributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
            .foregroundColor: UIColor.black
        ]
        let scaleText = String(format: "%.0f ft", distanceInFeet)
        scaleText.draw(at: CGPoint(x: scaleBarX + scaleBarLength/2 - 15, y: scaleBarY - 20), withAttributes: scaleAttributes)
    }

    // MARK: - Export Methods

    func exportToPDF(_ floorPlan: FloorPlanData, showMeasurements: Bool = true) -> Data? {
        let pageSize = CGSize(width: 612, height: 792) // Letter size
        let pdfData = NSMutableData()

        UIGraphicsBeginPDFContextToData(pdfData, CGRect(origin: .zero, size: pageSize), nil)
        UIGraphicsBeginPDFPage()

        guard let context = UIGraphicsGetCurrentContext() else {
            UIGraphicsEndPDFContext()
            return nil
        }

        // Render floor plan to PDF context
        if let image = renderFloorPlan(floorPlan, size: pageSize, showMeasurements: showMeasurements) {
            image.draw(in: CGRect(origin: .zero, size: pageSize))
        }

        UIGraphicsEndPDFContext()

        return pdfData as Data
    }

    func exportToPNG(_ floorPlan: FloorPlanData, size: CGSize? = nil, showMeasurements: Bool = true) -> Data? {
        guard let image = renderFloorPlan(floorPlan, size: size ?? CGSize(width: 1200, height: 900), showMeasurements: showMeasurements) else {
            return nil
        }
        return image.pngData()
    }

    // MARK: - Utility Methods

    private func calculateBoundingBox(walls: [FloorPlanWall]) -> CGRect {
        guard !walls.isEmpty else {
            return CGRect(x: -5, y: -5, width: 10, height: 10)
        }

        var minX = CGFloat.infinity
        var minY = CGFloat.infinity
        var maxX = -CGFloat.infinity
        var maxY = -CGFloat.infinity

        for wall in walls {
            minX = min(minX, wall.startPoint.x, wall.endPoint.x)
            minY = min(minY, wall.startPoint.y, wall.endPoint.y)
            maxX = max(maxX, wall.startPoint.x, wall.endPoint.x)
            maxY = max(maxY, wall.startPoint.y, wall.endPoint.y)
        }

        // Add padding
        let padding: CGFloat = 1.0
        return CGRect(
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2
        )
    }

    // Create an ordered polygon from wall segments by tracing connected walls
    private func createOrderedPolygon(from walls: [FloorPlanWall]) -> [CGPoint] {
        guard !walls.isEmpty else { return [] }

        let tolerance: CGFloat = 0.25 // 25cm tolerance for connecting walls

        // Simple approach: trace walls by following connected endpoints
        var remainingWalls = walls.map { ($0.startPoint, $0.endPoint) }
        var polygon: [CGPoint] = []

        // Start with the first wall
        guard let first = remainingWalls.first else { return [] }
        polygon.append(first.0)
        polygon.append(first.1)
        remainingWalls.removeFirst()

        var currentEnd = first.1
        var iterations = 0
        let maxIterations = walls.count * 2

        // Keep finding the next connected wall
        while !remainingWalls.isEmpty && iterations < maxIterations {
            iterations += 1

            var foundNext = false
            for i in 0..<remainingWalls.count {
                let wall = remainingWalls[i]

                // Check if this wall connects to current end
                if distance(wall.0, currentEnd) < tolerance {
                    // wall.0 connects, so add wall.1
                    if distance(wall.1, polygon[0]) > tolerance { // Don't add if we're closing the loop
                        polygon.append(wall.1)
                    }
                    currentEnd = wall.1
                    remainingWalls.remove(at: i)
                    foundNext = true
                    break
                } else if distance(wall.1, currentEnd) < tolerance {
                    // wall.1 connects, so add wall.0
                    if distance(wall.0, polygon[0]) > tolerance {
                        polygon.append(wall.0)
                    }
                    currentEnd = wall.0
                    remainingWalls.remove(at: i)
                    foundNext = true
                    break
                }
            }

            // If we couldn't find a connected wall, check if we've closed the loop
            if !foundNext {
                if distance(currentEnd, polygon[0]) < tolerance {
                    // Loop is closed
                    break
                }
                // Otherwise, we have disconnected walls - skip for now
                break
            }
        }

        // Remove consecutive duplicate points
        var cleanedPolygon: [CGPoint] = []
        for point in polygon {
            if cleanedPolygon.isEmpty || distance(point, cleanedPolygon.last!) > tolerance {
                cleanedPolygon.append(point)
            }
        }

        // If polygon is too small or invalid, fall back to convex hull
        if cleanedPolygon.count < 3 {
            print("FloorPlanGenerator: Traced polygon too small (\(cleanedPolygon.count) points), using convex hull")
            var allPoints: [CGPoint] = []
            for wall in walls {
                allPoints.append(wall.startPoint)
                allPoints.append(wall.endPoint)
            }
            return computeConvexHull(from: allPoints)
        }

        print("FloorPlanGenerator: Traced polygon with \(cleanedPolygon.count) corners from \(walls.count) walls")

        return cleanedPolygon
    }

    // Check if a polygon is valid (non-self-intersecting)
    private func isValidPolygon(_ points: [CGPoint]) -> Bool {
        guard points.count >= 3 else { return false }

        // Check for self-intersection by testing each pair of non-adjacent edges
        for i in 0..<points.count {
            let a1 = points[i]
            let a2 = points[(i + 1) % points.count]

            for j in (i + 2)..<points.count {
                // Skip adjacent edges
                if (j + 1) % points.count == i { continue }

                let b1 = points[j]
                let b2 = points[(j + 1) % points.count]

                if segmentsIntersect(a1, a2, b1, b2) {
                    return false
                }
            }
        }

        return true
    }

    // Check if two line segments intersect
    private func segmentsIntersect(_ a1: CGPoint, _ a2: CGPoint, _ b1: CGPoint, _ b2: CGPoint) -> Bool {
        let d1 = crossProduct(b2 - b1, a1 - b1)
        let d2 = crossProduct(b2 - b1, a2 - b1)
        let d3 = crossProduct(a2 - a1, b1 - a1)
        let d4 = crossProduct(a2 - a1, b2 - a1)

        if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)) {
            return true
        }

        return false
    }

    private func crossProduct(_ v1: CGPoint, _ v2: CGPoint) -> CGFloat {
        return v1.x * v2.y - v1.y * v2.x
    }

    // Compute convex hull using Graham scan algorithm
    private func computeConvexHull(from points: [CGPoint]) -> [CGPoint] {
        guard points.count >= 3 else { return points }

        // Find the bottom-most point (or leftmost in case of tie)
        var sortedPoints = points
        sortedPoints.sort { p1, p2 in
            if p1.y != p2.y { return p1.y < p2.y }
            return p1.x < p2.x
        }

        let start = sortedPoints.removeFirst()

        // Sort remaining points by polar angle with respect to start
        sortedPoints.sort { p1, p2 in
            let angle1 = atan2(p1.y - start.y, p1.x - start.x)
            let angle2 = atan2(p2.y - start.y, p2.x - start.x)
            if abs(angle1 - angle2) > 0.0001 {
                return angle1 < angle2
            }
            // If same angle, closer point first
            return distance(start, p1) < distance(start, p2)
        }

        var hull: [CGPoint] = [start]

        for point in sortedPoints {
            // Remove points that make a clockwise turn
            while hull.count > 1 {
                let top = hull[hull.count - 1]
                let nextToTop = hull[hull.count - 2]
                let cross = crossProduct(top - nextToTop, point - nextToTop)
                if cross <= 0 {
                    hull.removeLast()
                } else {
                    break
                }
            }
            hull.append(point)
        }

        return hull
    }

    // Calculate distance between two points
    private func distance(_ p1: CGPoint, _ p2: CGPoint) -> CGFloat {
        let dx = p2.x - p1.x
        let dy = p2.y - p1.y
        return sqrt(dx*dx + dy*dy)
    }

    // Deduplicate walls that are very close together and parallel (same wall detected twice)
    private func deduplicateWalls(_ walls: [FloorPlanWall]) -> [FloorPlanWall] {
        guard walls.count > 1 else { return walls }

        let distanceThreshold: CGFloat = 0.3 // 30cm - walls closer than this are likely duplicates
        let angleThreshold: CGFloat = 0.15 // ~8.5 degrees - walls with similar angles

        var result: [FloorPlanWall] = []
        var used: [Bool] = Array(repeating: false, count: walls.count)

        for i in 0..<walls.count {
            if used[i] { continue }

            let wall1 = walls[i]
            let angle1 = atan2(wall1.endPoint.y - wall1.startPoint.y, wall1.endPoint.x - wall1.startPoint.x)

            // Find all walls that might be duplicates of this one
            var duplicateGroup: [Int] = [i]

            for j in (i + 1)..<walls.count {
                if used[j] { continue }

                let wall2 = walls[j]
                let angle2 = atan2(wall2.endPoint.y - wall2.startPoint.y, wall2.endPoint.x - wall2.startPoint.x)

                // Check if angles are similar (parallel walls)
                var angleDiff = abs(angle1 - angle2)
                // Normalize - walls could be pointing opposite directions
                if angleDiff > .pi { angleDiff = 2 * .pi - angleDiff }
                if angleDiff > .pi / 2 { angleDiff = .pi - angleDiff }

                if angleDiff > angleThreshold { continue }

                // Check if walls are close together (perpendicular distance)
                let midpoint1 = CGPoint(
                    x: (wall1.startPoint.x + wall1.endPoint.x) / 2,
                    y: (wall1.startPoint.y + wall1.endPoint.y) / 2
                )
                let midpoint2 = CGPoint(
                    x: (wall2.startPoint.x + wall2.endPoint.x) / 2,
                    y: (wall2.startPoint.y + wall2.endPoint.y) / 2
                )

                // Calculate perpendicular distance from midpoint2 to wall1's line
                let perpDist = perpendicularDistance(point: midpoint2, lineStart: wall1.startPoint, lineEnd: wall1.endPoint)

                // Also check if midpoints are reasonably close along the wall direction
                let alongDist = distance(midpoint1, midpoint2)

                // If perpendicular distance is small and walls overlap, they're duplicates
                if perpDist < distanceThreshold && alongDist < max(CGFloat(wall1.length / metersToFeet), CGFloat(wall2.length / metersToFeet)) * 0.8 {
                    duplicateGroup.append(j)
                    used[j] = true
                }
            }

            used[i] = true

            // Merge duplicate walls - keep the longest one or merge endpoints
            if duplicateGroup.count == 1 {
                result.append(wall1)
            } else {
                // Find all endpoints and create a merged wall
                var allPoints: [CGPoint] = []
                var maxLength: Float = 0
                var bestThickness: CGFloat = wall1.thickness
                var bestHeight: Float = wall1.height

                for idx in duplicateGroup {
                    let w = walls[idx]
                    allPoints.append(w.startPoint)
                    allPoints.append(w.endPoint)
                    if w.length > maxLength {
                        maxLength = w.length
                        bestThickness = w.thickness
                        bestHeight = w.height
                    }
                }

                // Project all points onto the wall direction and find extremes
                let dir = CGPoint(x: cos(angle1), y: sin(angle1))
                var minProj = CGFloat.infinity
                var maxProj = -CGFloat.infinity
                var minPoint = allPoints[0]
                var maxPoint = allPoints[0]
                let refPoint = allPoints[0]

                for point in allPoints {
                    let proj = (point.x - refPoint.x) * dir.x + (point.y - refPoint.y) * dir.y
                    if proj < minProj {
                        minProj = proj
                        minPoint = point
                    }
                    if proj > maxProj {
                        maxProj = proj
                        maxPoint = point
                    }
                }

                let mergedLength = Float(distance(minPoint, maxPoint)) * metersToFeet
                result.append(FloorPlanWall(
                    startPoint: minPoint,
                    endPoint: maxPoint,
                    thickness: bestThickness,
                    length: mergedLength,
                    height: bestHeight
                ))

                print("FloorPlanGenerator: Merged \(duplicateGroup.count) duplicate walls into one")
            }
        }

        return result
    }

    // Calculate perpendicular distance from a point to a line segment
    private func perpendicularDistance(point: CGPoint, lineStart: CGPoint, lineEnd: CGPoint) -> CGFloat {
        let dx = lineEnd.x - lineStart.x
        let dy = lineEnd.y - lineStart.y
        let length = sqrt(dx * dx + dy * dy)

        if length < 0.0001 {
            return distance(point, lineStart)
        }

        // Perpendicular distance = |cross product| / |line length|
        let cross = abs((point.x - lineStart.x) * dy - (point.y - lineStart.y) * dx)
        return cross / length
    }
}
