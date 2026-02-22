import AppIntents

@available(iOS 16.0, *)
struct CreateTaskIntent: AppIntent {

    static var title: LocalizedStringResource = "Create Task in OnSite"
    static var description = IntentDescription("Create a new task in your OnSite project management.")

    @Parameter(title: "Task Details")
    var details: String

    static var parameterSummary: some ParameterSummary {
        Summary("Create task: \(\.$details)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Create a new task: \(details)"

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
