import AppIntents

@available(iOS 16.0, *)
struct GetProjectsIntent: AppIntent {

    static var title: LocalizedStringResource = "Get Projects from OnSite"
    static var description = IntentDescription("Get a summary of your current projects.")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Give me a summary of my projects"

        do {
            let response = try await OnSiteAPIClient.sendChatMessage(prompt)
            let cleaned = response.replacingOccurrences(of: "**", with: "")
                .replacingOccurrences(of: "*", with: "")
            let truncated = String(cleaned.prefix(600))
            return .result(dialog: IntentDialog(stringLiteral: truncated))
        } catch {
            return .result(dialog: IntentDialog(stringLiteral: error.localizedDescription))
        }
    }
}
