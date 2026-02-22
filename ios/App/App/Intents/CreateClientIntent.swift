import AppIntents

@available(iOS 16.0, *)
struct CreateClientIntent: AppIntent {

    static var title: LocalizedStringResource = "Add Client in OnSite"
    static var description = IntentDescription("Add a new client to your OnSite contacts.")

    @Parameter(title: "Client Details")
    var details: String

    static var parameterSummary: some ParameterSummary {
        Summary("Add client: \(\.$details)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Add a new client: \(details)"

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
