import Foundation
import Combine

struct ChatMessage: Identifiable {
    let id: String
    let role: String
    let content: String

    init(role: String, content: String) {
        self.id = UUID().uuidString
        self.role = role
        self.content = content
    }
}

@MainActor
class EstimateViewModel: ObservableObject {
    @Published var estimate: Estimate = Estimate()
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false

    // AI Rules
    @Published var showDemoRatePrompt = false
    @Published var showLaborCostPrompt = false
    @Published var demoItemIndex: Int?

    // Navigation
    @Published var showPreview = false
    @Published var showLineItemEditor = false
    @Published var editingItemIndex: Int?

    // Clients
    @Published var clients: [Client] = []

    // AI Chat
    @Published var aiChatMessages: [ChatMessage] = []
    @Published var aiEstimateItems: [EstimateItem] = []

    private let apiService = EstimateAPIService()

    init() {
        checkAuthentication()
    }

    func checkAuthentication() {
        isAuthenticated = KeychainHelper.read(key: OnSiteConfig.keychainAccessToken) != nil
    }

    // MARK: - Line Item Management

    func addLineItem(_ item: EstimateItem) {
        var newItem = item
        newItem.totalPrice = newItem.quantity * newItem.unitPrice
        estimate.items.append(newItem)
        estimate.recalculate()

        // AI Rules: Check for demo/demolition
        let lower = newItem.description.lowercased()
        if lower.contains("demo") || lower.contains("demolition") {
            demoItemIndex = estimate.items.count - 1
            showDemoRatePrompt = true
        }

        // AI Rules: Prompt for labor after adding materials
        checkShouldPromptLabor()
    }

    func updateLineItem(at index: Int, with item: EstimateItem) {
        guard index < estimate.items.count else { return }
        var updated = item
        updated.totalPrice = updated.quantity * updated.unitPrice
        estimate.items[index] = updated
        estimate.recalculate()
    }

    func removeLineItem(at offsets: IndexSet) {
        estimate.items.remove(atOffsets: offsets)
        estimate.recalculate()
    }

    func updateTaxRate(_ rate: Double) {
        estimate.taxRate = rate
        estimate.recalculate()
    }

    // MARK: - AI Rules

    /// After adding material items, prompt for labor if none exist yet
    private func checkShouldPromptLabor() {
        let hasMaterials = estimate.items.contains { $0.type == .material }
        let hasLabor = estimate.items.contains { $0.type == .labor }
        if hasMaterials && !hasLabor && estimate.items.count >= 2 {
            showLaborCostPrompt = true
        }
    }

    /// Add a labor item after user confirms and enters their rate
    func addLaborItem(description: String, hours: Double, hourlyRate: Double) {
        let item = EstimateItem(
            description: description.isEmpty ? "Labor" : description,
            quantity: hours,
            unit: "hr",
            unitPrice: hourlyRate,
            totalPrice: hours * hourlyRate,
            type: .labor
        )
        estimate.items.append(item)
        estimate.recalculate()
        showLaborCostPrompt = false
    }

    /// Update demo item with user-provided rate per sq ft
    func updateDemoRate(pricePerSqFt: Double, sqFt: Double) {
        guard let index = demoItemIndex, index < estimate.items.count else { return }
        estimate.items[index].unitPrice = pricePerSqFt
        estimate.items[index].quantity = sqFt
        estimate.items[index].unit = "sq ft"
        estimate.items[index].totalPrice = pricePerSqFt * sqFt
        estimate.recalculate()
        showDemoRatePrompt = false
        demoItemIndex = nil
    }

    // MARK: - Clients

    func loadClients() async {
        guard isAuthenticated else { return }
        do {
            clients = try await apiService.fetchClients()
        } catch {
            // Non-critical
            print("[OnSiteMessages] Failed to load clients: \(error)")
        }
    }

    func createEstimateEmailResponse() async {
        do {
            try await apiService.createEstimateEmailResponse(estimate: estimate)
        } catch {
            print("[OnSiteMessages] Failed to create email response: \(error)")
        }
    }

    // MARK: - API

    func saveAndSend() async -> Bool {
        guard isAuthenticated else {
            errorMessage = "Please open OnSite and log in first."
            return false
        }

        guard !estimate.title.isEmpty else {
            errorMessage = "Please enter an estimate title."
            return false
        }

        guard !estimate.items.isEmpty else {
            errorMessage = "Please add at least one line item."
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            estimate.status = .sent
            estimate.createdAt = ISO8601DateFormatter().string(from: Date())
            let saved = try await apiService.saveEstimate(estimate)
            estimate = saved
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }

    func loadEstimate(id: String) async {
        isLoading = true
        errorMessage = nil
        do {
            if isAuthenticated {
                estimate = try await apiService.getEstimate(id: id)
            } else {
                estimate = try await apiService.getEstimatePublic(id: id)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func respondToEstimate(id: String, action: String) async -> Bool {
        isLoading = true
        errorMessage = nil
        do {
            try await apiService.respondToEstimate(estimateId: id, action: action)
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - AI Chat

    func sendAIChatMessage(_ text: String) async {
        let userMessage = ChatMessage(role: "user", content: text)
        aiChatMessages.append(userMessage)

        let history = aiChatMessages.dropLast().map { ["role": $0.role, "content": $0.content] }

        do {
            let response = try await apiService.sendChatMessage(
                text,
                messageHistory: Array(history),
                currentEstimate: aiEstimateItems.isEmpty ? estimate.items : aiEstimateItems
            )

            let assistantMessage = ChatMessage(role: "assistant", content: response.message)
            aiChatMessages.append(assistantMessage)

            if !response.updatedEstimate.isEmpty {
                aiEstimateItems = response.updatedEstimate
            }
        } catch {
            let errorMsg = ChatMessage(role: "assistant", content: "Sorry, I encountered an error: \(error.localizedDescription)")
            aiChatMessages.append(errorMsg)
        }
    }

    func acceptAIItems() {
        for item in aiEstimateItems {
            estimate.items.append(item)
        }
        estimate.recalculate()
        aiEstimateItems = []
        aiChatMessages = []
    }
}
