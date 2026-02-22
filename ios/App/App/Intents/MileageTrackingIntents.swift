import AppIntents

@available(iOS 16.0, *)
struct StartMileageTrackingIntent: AppIntent {

    static var title: LocalizedStringResource = "Start Mileage Tracking in OnSite"
    static var description = IntentDescription("Start automatically tracking your business mileage using GPS.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Opening OnSite to start mileage tracking...")
    }
}

@available(iOS 16.0, *)
struct StopMileageTrackingIntent: AppIntent {

    static var title: LocalizedStringResource = "Stop Mileage Tracking in OnSite"
    static var description = IntentDescription("Stop the current GPS mileage tracking session.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Opening OnSite to stop mileage tracking...")
    }
}
