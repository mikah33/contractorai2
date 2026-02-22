import AppIntents

@available(iOS 16.0, *)
struct LogMileageIntent: AppIntent {

    static var title: LocalizedStringResource = "Log Mileage in OnSite"
    static var description = IntentDescription("Log business mileage for tax deductions.")

    @Parameter(title: "Mileage Details")
    var details: String

    static var parameterSummary: some ParameterSummary {
        Summary("Log mileage: \(\.$details)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Log business mileage: \(details)"

        do {
            let response = try await OnSiteAPIClient.sendChatMessage(prompt)
            let cleaned = response.replacingOccurrences(of: "**", with: "")
                .replacingOccurrences(of: "*", with: "")
            let truncated = String(cleaned.prefix(400))
            return .result(dialog: IntentDialog(stringLiteral: truncated))
        } catch {
            return .result(dialog: IntentDialog(stringLiteral: error.localizedDescription))
        }
    }
}
