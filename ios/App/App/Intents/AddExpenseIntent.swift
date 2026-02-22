import AppIntents

@available(iOS 16.0, *)
struct AddExpenseIntent: AppIntent {

    static var title: LocalizedStringResource = "Add Expense in OnSite"
    static var description = IntentDescription("Record a business expense for tracking and tax deductions.")

    @Parameter(title: "Expense Details")
    var details: String

    static var parameterSummary: some ParameterSummary {
        Summary("Add expense: \(\.$details)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let prompt = "Add a business expense: \(details)"

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
