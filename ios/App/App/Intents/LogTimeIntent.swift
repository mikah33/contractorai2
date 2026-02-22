import AppIntents

@available(iOS 16.0, *)
struct LogTimeIntent: AppIntent {

    static var title: LocalizedStringResource = "Log Time in OnSite"
    static var description = IntentDescription("Log work hours for an employee.")

    @Parameter(title: "Time Details")
    var details: String

    static var parameterSummary: some ParameterSummary {
        Summary("Log time: \(\.$details)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Log work time: \(details)"

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
