import AppIntents

@available(iOS 16.0, *)
struct AskOnSiteIntent: AppIntent {

    static var title: LocalizedStringResource = "Ask OnSite"
    static var description = IntentDescription("Ask OnSite anything about your contracting business — projects, tasks, estimates, invoices, clients, employees, mileage, expenses, and more.")

    @Parameter(title: "Request")
    var request: String

    static var parameterSummary: some ParameterSummary {
        Summary("Ask OnSite \(\.$request)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let response = try await OnSiteAPIClient.sendChatMessage(request)
            let cleaned = stripMarkdown(response)
            let truncated = String(cleaned.prefix(600))
            return .result(dialog: IntentDialog(stringLiteral: truncated))
        } catch {
            return .result(dialog: IntentDialog(stringLiteral: error.localizedDescription))
        }
    }

    private func stripMarkdown(_ text: String) -> String {
        var result = text
        // Remove bold/italic markers
        result = result.replacingOccurrences(of: "**", with: "")
        result = result.replacingOccurrences(of: "__", with: "")
        result = result.replacingOccurrences(of: "*", with: "")
        result = result.replacingOccurrences(of: "_", with: "")
        // Remove headers
        result = result.replacingOccurrences(of: "### ", with: "")
        result = result.replacingOccurrences(of: "## ", with: "")
        result = result.replacingOccurrences(of: "# ", with: "")
        // Remove bullet points
        result = result.replacingOccurrences(of: "- ", with: "")
        // Remove code blocks
        result = result.replacingOccurrences(of: "```", with: "")
        result = result.replacingOccurrences(of: "`", with: "")
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
