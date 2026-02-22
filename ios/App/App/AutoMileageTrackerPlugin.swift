import Foundation
import Capacitor
import CoreLocation
import UserNotifications

@objc(AutoMileageTrackerPlugin)
public class AutoMileageTrackerPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {

    public let identifier = "AutoMileageTrackerPlugin"
    public let jsName = "AutoMileageTracker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTracking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTrackingStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentTrip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCompletedTrips", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCompletedTrips", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAlwaysPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPermissionStatus", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Data Models

    struct GPSPoint: Codable {
        let latitude: Double
        let longitude: Double
        let speed: Double
        let timestamp: Date
        let accuracy: Double
    }

    struct TripData: Codable {
        var startTime: Date
        var startLatitude: Double
        var startLongitude: Double
        var points: [GPSPoint]
        var lastUpdateTime: Date
    }

    struct CompletedTrip: Codable {
        let id: String
        let startTime: Date
        let endTime: Date
        let startLatitude: Double
        let startLongitude: Double
        let endLatitude: Double
        let endLongitude: Double
        let startAddress: String
        let endAddress: String
        let totalMiles: Double
        let durationSeconds: Int
        let pointCount: Int
    }

    // MARK: - Properties

    private var locationManager: CLLocationManager!
    private let geocoder = CLGeocoder()

    private var isTracking = false
    private var currentTrip: TripData? = nil
    private var completedTrips: [CompletedTrip] = []

    // Trip detection state
    private var highSpeedSampleCount: Int = 0
    private var lastMovingTime: Date? = nil
    private var stationaryTimer: Timer? = nil

    // Pending call for permission request
    private var pendingPermissionCall: CAPPluginCall? = nil
    private var pendingStartCall: CAPPluginCall? = nil

    // MARK: - Constants

    private let speedThreshold: Double = 6.7       // m/s (~15 mph)
    private let speedSamplesToConfirm: Int = 3
    private let stationaryTimeout: TimeInterval = 120  // 2 minutes
    private let minTripDistanceKm: Double = 0.8047     // 0.5 miles
    private let minTripDuration: TimeInterval = 60     // 1 minute
    private let gpsDistanceFilter: Double = 25.0       // meters
    private let lowSpeedThreshold: Double = 1.0        // m/s (~2 mph)

    // UserDefaults keys
    private let udKeyTracking = "autoMileage_isTracking"
    private let udKeyCurrentTrip = "autoMileage_currentTrip"
    private let udKeyCompletedTrips = "autoMileage_completedTrips"

    // MARK: - Lifecycle

    override public func load() {
        locationManager = CLLocationManager()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = gpsDistanceFilter
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true

        // Restore state from UserDefaults
        restoreState()
    }

    // MARK: - State Persistence

    private func restoreState() {
        let defaults = UserDefaults.standard

        isTracking = defaults.bool(forKey: udKeyTracking)

        // Restore current trip
        if let tripData = defaults.data(forKey: udKeyCurrentTrip) {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            currentTrip = try? decoder.decode(TripData.self, from: tripData)

            // If a trip was in progress but too much time has passed, finalize it
            if let trip = currentTrip {
                let elapsed = Date().timeIntervalSince(trip.lastUpdateTime)
                if elapsed > stationaryTimeout * 2 {
                    finalizeTrip()
                }
            }
        }

        // Restore completed trips
        if let tripsData = defaults.data(forKey: udKeyCompletedTrips) {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            completedTrips = (try? decoder.decode([CompletedTrip].self, from: tripsData)) ?? []
        }

        // Resume tracking if it was active
        if isTracking {
            if currentTrip != nil {
                locationManager.startUpdatingLocation()
            } else {
                locationManager.startMonitoringSignificantLocationChanges()
            }
        }
    }

    private func persistCurrentTrip() {
        let defaults = UserDefaults.standard
        if let trip = currentTrip {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            if let data = try? encoder.encode(trip) {
                defaults.set(data, forKey: udKeyCurrentTrip)
            }
        } else {
            defaults.removeObject(forKey: udKeyCurrentTrip)
        }
    }

    private func persistCompletedTrips() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        if let data = try? encoder.encode(completedTrips) {
            UserDefaults.standard.set(data, forKey: udKeyCompletedTrips)
        }
    }

    private func persistTrackingState() {
        UserDefaults.standard.set(isTracking, forKey: udKeyTracking)
    }

    // MARK: - Plugin Methods

    @objc func startTracking(_ call: CAPPluginCall) {
        let authStatus = locationManager.authorizationStatus

        guard authStatus == .authorizedAlways else {
            if authStatus == .authorizedWhenInUse {
                // Need to upgrade to Always
                pendingStartCall = call
                locationManager.requestAlwaysAuthorization()
                return
            } else if authStatus == .notDetermined {
                pendingStartCall = call
                locationManager.requestWhenInUseAuthorization()
                return
            } else {
                call.reject("Location permission denied. Please enable 'Always' location access in Settings.")
                return
            }
        }

        beginTracking()
        call.resolve(["success": true, "status": "monitoring"])
    }

    private func beginTracking() {
        isTracking = true
        persistTrackingState()
        highSpeedSampleCount = 0
        lastMovingTime = nil

        if currentTrip != nil {
            locationManager.startUpdatingLocation()
        } else {
            locationManager.startMonitoringSignificantLocationChanges()
        }
    }

    @objc func stopTracking(_ call: CAPPluginCall) {
        locationManager.stopUpdatingLocation()
        locationManager.stopMonitoringSignificantLocationChanges()
        stationaryTimer?.invalidate()
        stationaryTimer = nil

        if currentTrip != nil {
            finalizeTrip()
        }

        isTracking = false
        persistTrackingState()
        highSpeedSampleCount = 0
        lastMovingTime = nil

        call.resolve(["success": true])
    }

    @objc func getTrackingStatus(_ call: CAPPluginCall) {
        let authStatus = locationManager.authorizationStatus
        var permString = "notDetermined"
        switch authStatus {
        case .authorizedAlways: permString = "authorizedAlways"
        case .authorizedWhenInUse: permString = "authorizedWhenInUse"
        case .denied: permString = "denied"
        case .restricted: permString = "restricted"
        default: permString = "notDetermined"
        }

        call.resolve([
            "isTracking": isTracking,
            "isInTrip": currentTrip != nil,
            "permissionStatus": permString
        ])
    }

    @objc func getCurrentTrip(_ call: CAPPluginCall) {
        guard let trip = currentTrip else {
            call.resolve(["active": false])
            return
        }

        let distance = calculateTotalDistance(points: trip.points)
        let miles = distance * 0.621371 // km to miles
        let elapsed = Date().timeIntervalSince(trip.startTime)

        call.resolve([
            "active": true,
            "startTime": ISO8601DateFormatter().string(from: trip.startTime),
            "elapsedSeconds": Int(elapsed),
            "currentMiles": round(miles * 10) / 10,
            "pointCount": trip.points.count
        ])
    }

    @objc func getCompletedTrips(_ call: CAPPluginCall) {
        let formatter = ISO8601DateFormatter()
        let tripsArray = completedTrips.map { trip -> [String: Any] in
            return [
                "id": trip.id,
                "startTime": formatter.string(from: trip.startTime),
                "endTime": formatter.string(from: trip.endTime),
                "startAddress": trip.startAddress,
                "endAddress": trip.endAddress,
                "totalMiles": trip.totalMiles,
                "durationSeconds": trip.durationSeconds,
                "pointCount": trip.pointCount
            ]
        }
        call.resolve(["trips": tripsArray])
    }

    @objc func clearCompletedTrips(_ call: CAPPluginCall) {
        completedTrips.removeAll()
        persistCompletedTrips()
        call.resolve(["success": true])
    }

    @objc func requestAlwaysPermission(_ call: CAPPluginCall) {
        let authStatus = locationManager.authorizationStatus

        if authStatus == .authorizedAlways {
            call.resolve(["status": "authorizedAlways"])
            return
        }

        pendingPermissionCall = call

        if authStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        } else if authStatus == .authorizedWhenInUse {
            locationManager.requestAlwaysAuthorization()
        } else {
            call.resolve(["status": authStatusString(authStatus)])
        }
    }

    @objc func getPermissionStatus(_ call: CAPPluginCall) {
        call.resolve(["status": authStatusString(locationManager.authorizationStatus)])
    }

    private func authStatusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways: return "authorizedAlways"
        case .authorizedWhenInUse: return "authorizedWhenInUse"
        case .denied: return "denied"
        case .restricted: return "restricted"
        default: return "notDetermined"
        }
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isTracking else { return }

        for location in locations {
            // Filter out inaccurate readings
            guard location.horizontalAccuracy >= 0,
                  location.horizontalAccuracy < 65 else { continue }

            let speed = max(location.speed, 0) // -1 means invalid

            if currentTrip == nil {
                handleTripDetection(location: location, speed: speed)
            } else {
                handleActiveTripUpdate(location: location, speed: speed)
            }
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus

        // Handle pending permission call
        if let call = pendingPermissionCall {
            if status == .authorizedAlways {
                call.resolve(["status": "authorizedAlways"])
            } else if status == .authorizedWhenInUse {
                // First step done, now request Always
                manager.requestAlwaysAuthorization()
                return // Don't clear the pending call yet
            } else if status != .notDetermined {
                call.resolve(["status": authStatusString(status)])
            } else {
                return // Still determining
            }
            pendingPermissionCall = nil
        }

        // Handle pending start call
        if let call = pendingStartCall {
            if status == .authorizedAlways {
                beginTracking()
                call.resolve(["success": true, "status": "monitoring"])
            } else if status == .authorizedWhenInUse {
                manager.requestAlwaysAuthorization()
                return
            } else if status != .notDetermined {
                call.reject("Location permission not granted as 'Always'. Please enable it in Settings.")
            } else {
                return
            }
            pendingStartCall = nil
        }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("[AutoMileageTracker] Location error: \(error.localizedDescription)")
    }

    // MARK: - Trip Detection

    private func handleTripDetection(location: CLLocation, speed: Double) {
        if speed >= speedThreshold {
            highSpeedSampleCount += 1

            if highSpeedSampleCount >= speedSamplesToConfirm {
                startTrip(at: location)
            }
        } else {
            // Reset counter if speed drops below threshold
            if speed < speedThreshold / 2 {
                highSpeedSampleCount = 0
            }
        }
    }

    private func startTrip(at location: CLLocation) {
        let point = GPSPoint(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            speed: location.speed,
            timestamp: Date(),
            accuracy: location.horizontalAccuracy
        )

        currentTrip = TripData(
            startTime: Date(),
            startLatitude: location.coordinate.latitude,
            startLongitude: location.coordinate.longitude,
            points: [point],
            lastUpdateTime: Date()
        )

        highSpeedSampleCount = 0
        lastMovingTime = Date()
        persistCurrentTrip()

        // Switch to continuous GPS for better accuracy during the trip
        locationManager.stopMonitoringSignificantLocationChanges()
        locationManager.startUpdatingLocation()

        print("[AutoMileageTracker] Trip started at \(location.coordinate)")
    }

    // MARK: - Active Trip Updates

    private func handleActiveTripUpdate(location: CLLocation, speed: Double) {
        let point = GPSPoint(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            speed: speed,
            timestamp: Date(),
            accuracy: location.horizontalAccuracy
        )

        currentTrip?.points.append(point)
        currentTrip?.lastUpdateTime = Date()

        // Persist every 10 points for crash recovery
        if let count = currentTrip?.points.count, count % 10 == 0 {
            persistCurrentTrip()
        }

        if speed > lowSpeedThreshold {
            // Still moving
            lastMovingTime = Date()
            stationaryTimer?.invalidate()
            stationaryTimer = nil
        } else {
            // Possibly stationary -- start countdown if not already
            if stationaryTimer == nil {
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else { return }
                    self.stationaryTimer = Timer.scheduledTimer(
                        withTimeInterval: self.stationaryTimeout,
                        repeats: false
                    ) { [weak self] _ in
                        self?.finalizeTrip()
                    }
                }
            }
        }
    }

    // MARK: - Trip Finalization

    private func finalizeTrip() {
        stationaryTimer?.invalidate()
        stationaryTimer = nil

        guard let trip = currentTrip else { return }

        let distanceKm = calculateTotalDistance(points: trip.points)
        let miles = distanceKm * 0.621371
        let duration = Date().timeIntervalSince(trip.startTime)

        // Check minimum thresholds
        guard distanceKm >= minTripDistanceKm, duration >= minTripDuration else {
            print("[AutoMileageTracker] Trip discarded: \(String(format: "%.2f", miles)) mi, \(Int(duration))s (below thresholds)")
            currentTrip = nil
            persistCurrentTrip()
            switchToSignificantLocationChanges()
            return
        }

        let endPoint = trip.points.last ?? trip.points.first!
        let startLocation = CLLocation(latitude: trip.startLatitude, longitude: trip.startLongitude)
        let endLocation = CLLocation(latitude: endPoint.latitude, longitude: endPoint.longitude)

        let tripId = UUID().uuidString
        let roundedMiles = round(miles * 10) / 10

        // Reverse geocode both endpoints
        reverseGeocode(location: startLocation) { [weak self] startAddr in
            self?.reverseGeocode(location: endLocation) { endAddr in
                guard let self = self else { return }

                let completed = CompletedTrip(
                    id: tripId,
                    startTime: trip.startTime,
                    endTime: Date(),
                    startLatitude: trip.startLatitude,
                    startLongitude: trip.startLongitude,
                    endLatitude: endPoint.latitude,
                    endLongitude: endPoint.longitude,
                    startAddress: startAddr,
                    endAddress: endAddr,
                    totalMiles: roundedMiles,
                    durationSeconds: Int(duration),
                    pointCount: trip.points.count
                )

                self.completedTrips.append(completed)
                self.persistCompletedTrips()

                // Send notification
                self.sendTripNotification(miles: roundedMiles)

                // Emit event to JS layer
                self.emitTripCompleted(completed)

                print("[AutoMileageTracker] Trip completed: \(roundedMiles) mi, \(startAddr) -> \(endAddr)")
            }
        }

        currentTrip = nil
        persistCurrentTrip()
        switchToSignificantLocationChanges()
    }

    private func switchToSignificantLocationChanges() {
        guard isTracking else { return }
        locationManager.stopUpdatingLocation()
        locationManager.startMonitoringSignificantLocationChanges()
        highSpeedSampleCount = 0
    }

    // MARK: - Reverse Geocoding

    private func reverseGeocode(location: CLLocation, completion: @escaping (String) -> Void) {
        geocoder.reverseGeocodeLocation(location) { placemarks, error in
            if let placemark = placemarks?.first {
                var parts: [String] = []
                if let street = placemark.thoroughfare {
                    if let number = placemark.subThoroughfare {
                        parts.append("\(number) \(street)")
                    } else {
                        parts.append(street)
                    }
                }
                if let city = placemark.locality {
                    parts.append(city)
                }
                if let state = placemark.administrativeArea {
                    parts.append(state)
                }
                let address = parts.isEmpty
                    ? String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude)
                    : parts.joined(separator: ", ")
                completion(address)
            } else {
                completion(String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude))
            }
        }
    }

    // MARK: - Notifications

    private func sendTripNotification(miles: Double) {
        let content = UNMutableNotificationContent()
        content.title = "Trip Recorded"
        content.body = String(format: "Potential miles deduction found: %.1f mi", miles)
        content.sound = .default
        content.userInfo = ["type": "auto_mileage_trip"]

        let request = UNNotificationRequest(
            identifier: "autoMileage_\(UUID().uuidString)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[AutoMileageTracker] Notification error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Capacitor Events

    private func emitTripCompleted(_ trip: CompletedTrip) {
        let formatter = ISO8601DateFormatter()
        notifyListeners("tripCompleted", data: [
            "id": trip.id,
            "startTime": formatter.string(from: trip.startTime),
            "endTime": formatter.string(from: trip.endTime),
            "startAddress": trip.startAddress,
            "endAddress": trip.endAddress,
            "totalMiles": trip.totalMiles,
            "durationSeconds": trip.durationSeconds,
            "pointCount": trip.pointCount
        ])
    }

    // MARK: - Distance Calculation

    private func haversineDistance(from: GPSPoint, to: GPSPoint) -> Double {
        let R = 6371.0 // Earth's radius in km
        let dLat = (to.latitude - from.latitude) * .pi / 180
        let dLon = (to.longitude - from.longitude) * .pi / 180
        let lat1 = from.latitude * .pi / 180
        let lat2 = to.latitude * .pi / 180

        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }

    private func calculateTotalDistance(points: [GPSPoint]) -> Double {
        guard points.count >= 2 else { return 0 }
        var total: Double = 0
        for i in 1..<points.count {
            total += haversineDistance(from: points[i - 1], to: points[i])
        }
        return total // km
    }
}
