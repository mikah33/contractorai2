import Foundation

struct EstimateAPIService {

    enum APIError: LocalizedError {
        case notAuthenticated
        case networkError(String)
        case serverError(Int, String)
        case decodingError

        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "Please open OnSite and log in first."
            case .networkError(let msg):
                return "Network error: \(msg)"
            case .serverError(let code, let msg):
                return "Server error (\(code)): \(msg)"
            case .decodingError:
                return "Failed to process server response."
            }
        }
    }

    private var baseURL: String { OnSiteConfig.supabaseURL }
    private var anonKey: String { OnSiteConfig.supabaseAnonKey }

    private func getAccessToken() throws -> String {
        guard let token = KeychainHelper.read(key: OnSiteConfig.keychainAccessToken) else {
            throw APIError.notAuthenticated
        }
        return token
    }

    private func getUserId() throws -> String {
        guard let userId = KeychainHelper.read(key: OnSiteConfig.keychainUserId) else {
            throw APIError.notAuthenticated
        }
        return userId
    }

    // MARK: - Save Estimate (upsert)

    func saveEstimate(_ estimate: Estimate) async throws -> Estimate {
        let token = try getAccessToken()
        let userId = try getUserId()

        guard let url = URL(string: "\(baseURL)/rest/v1/estimates") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        request.timeoutInterval = 30

        let itemsArray = estimate.items.map { item -> [String: Any] in
            var dict: [String: Any] = [
                "id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "unitPrice": item.unitPrice,
                "totalPrice": item.totalPrice,
                "type": item.type.rawValue
            ]
            if let notes = item.notes { dict["notes"] = notes }
            return dict
        }

        var body: [String: Any] = [
            "id": estimate.id,
            "title": estimate.title,
            "status": estimate.status.rawValue,
            "subtotal": estimate.subtotal,
            "tax_rate": estimate.taxRate,
            "tax_amount": estimate.taxAmount,
            "total": estimate.total,
            "terms": estimate.terms,
            "items": itemsArray,
            "user_id": userId,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]

        if let clientName = estimate.clientName { body["client_name"] = clientName }
        if let projectName = estimate.projectName { body["project_name"] = projectName }
        if let notes = estimate.notes { body["notes"] = notes }
        if let expiresAt = estimate.expiresAt { body["expires_at"] = expiresAt }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError("Invalid response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(httpResponse.statusCode, errorBody)
        }

        return estimate
    }

    // MARK: - Get Estimate

    func getEstimate(id: String) async throws -> Estimate {
        let token = try getAccessToken()

        guard let url = URL(string: "\(baseURL)/rest/v1/estimates?id=eq.\(id)&select=*") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw APIError.serverError(code, "Failed to fetch estimate")
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              let first = json.first else {
            throw APIError.decodingError
        }

        return mapEstimateFromJSON(first)
    }

    // MARK: - Get Estimate (public, no auth for recipients)

    func getEstimatePublic(id: String) async throws -> Estimate {
        guard let url = URL(string: "\(baseURL)/rest/v1/estimates?id=eq.\(id)&select=title,client_name,items,subtotal,tax_rate,tax_amount,total,notes,terms,status") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.decodingError
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              let first = json.first else {
            throw APIError.decodingError
        }

        return mapEstimateFromJSON(first)
    }

    // MARK: - Respond to Estimate

    func respondToEstimate(estimateId: String, action: String) async throws {
        guard let url = URL(string: "\(baseURL)/functions/v1/handle-estimate-response?id=\(estimateId)&action=\(action)") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...399).contains(httpResponse.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw APIError.serverError(code, "Failed to record response")
        }
    }

    // MARK: - Get Payment Link

    func getPaymentLink(estimateId: String) async throws -> String? {
        guard let url = URL(string: "\(baseURL)/rest/v1/estimate_payment_links?estimate_id=eq.\(estimateId)&select=payment_url,status&order=created_at.desc&limit=1") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            return nil
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              let first = json.first,
              let paymentUrl = first["payment_url"] as? String else {
            return nil
        }

        return paymentUrl
    }

    // MARK: - Create Estimate Email Response (for iMessage flow)

    func createEstimateEmailResponse(estimate: Estimate) async throws {
        let token = try getAccessToken()
        let userId = try getUserId()

        guard let url = URL(string: "\(baseURL)/rest/v1/estimate_email_responses") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        request.timeoutInterval = 15

        let body: [String: Any] = [
            "estimate_id": estimate.id,
            "customer_name": estimate.clientName ?? "iMessage Customer",
            "customer_email": "",
            "pdf_url": "",
            "email_subject": "",
            "email_body": "",
            "user_id": userId
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            // Non-critical — log but don't block sending
            print("[OnSiteMessages] Warning: Failed to create estimate_email_response")
            return
        }
    }

    // MARK: - Fetch Clients

    func fetchClients() async throws -> [Client] {
        let token = try getAccessToken()

        guard let url = URL(string: "\(baseURL)/rest/v1/clients?select=id,name,email,phone,company&order=name.asc") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            return []
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }

        return json.map { item in
            Client(
                id: item["id"] as? String ?? UUID().uuidString,
                name: item["name"] as? String ?? "",
                email: item["email"] as? String ?? "",
                phone: item["phone"] as? String ?? "",
                company: item["company"] as? String
            )
        }
    }

    // MARK: - AI Chat (Contractor Chat)

    struct ChatResponse {
        let message: String
        let updatedEstimate: [EstimateItem]
    }

    func sendChatMessage(
        _ text: String,
        messageHistory: [[String: String]],
        currentEstimate: [EstimateItem]
    ) async throws -> ChatResponse {
        let token = try getAccessToken()

        guard let url = URL(string: "\(baseURL)\(OnSiteConfig.chatFunctionPath)") else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 60  // AI can take longer

        // Build currentEstimate array matching the web format
        let estimateArray = currentEstimate.map { item -> [String: Any] in
            [
                "id": item.id,
                "name": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "unitPrice": item.unitPrice,
                "totalPrice": item.totalPrice,
                "type": item.type.rawValue,
                "isCustom": true
            ]
        }

        // Build messages array with history
        var messages: [[String: String]] = messageHistory
        messages.append(["role": "user", "content": text])

        let body: [String: Any] = [
            "messages": messages,
            "currentEstimate": estimateArray,
            "mode": "estimating"
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError("Invalid response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(httpResponse.statusCode, errorBody)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw APIError.decodingError
        }

        let responseMessage = json["message"] as? String ?? ""

        // Parse updatedEstimate from response
        var items: [EstimateItem] = []
        if let updatedEstimate = json["updatedEstimate"] as? [[String: Any]] {
            items = updatedEstimate.map { raw in
                let itemType = raw["type"] as? String ?? "material"
                return EstimateItem(
                    id: raw["id"] as? String ?? UUID().uuidString,
                    description: raw["name"] as? String ?? raw["description"] as? String ?? "",
                    quantity: raw["quantity"] as? Double ?? 1,
                    unit: raw["unit"] as? String ?? "ea",
                    unitPrice: raw["unitPrice"] as? Double ?? 0,
                    totalPrice: raw["totalPrice"] as? Double ?? 0,
                    type: ItemType(rawValue: itemType) ?? .material
                )
            }
        }

        return ChatResponse(message: responseMessage, updatedEstimate: items)
    }

    // MARK: - JSON Mapping

    private func mapEstimateFromJSON(_ json: [String: Any]) -> Estimate {
        let rawItems = json["items"] as? [[String: Any]] ?? []
        let items = rawItems.map { item -> EstimateItem in
            EstimateItem(
                id: item["id"] as? String ?? UUID().uuidString,
                description: item["description"] as? String ?? "",
                quantity: item["quantity"] as? Double ?? 1,
                unit: item["unit"] as? String ?? "ea",
                unitPrice: item["unitPrice"] as? Double ?? 0,
                totalPrice: item["totalPrice"] as? Double ?? 0,
                type: ItemType(rawValue: item["type"] as? String ?? "material") ?? .material,
                notes: item["notes"] as? String
            )
        }

        return Estimate(
            id: json["id"] as? String ?? UUID().uuidString,
            title: json["title"] as? String ?? "",
            clientName: json["client_name"] as? String,
            projectName: json["project_name"] as? String,
            status: EstimateStatus(rawValue: json["status"] as? String ?? "draft") ?? .draft,
            items: items,
            subtotal: json["subtotal"] as? Double ?? 0,
            taxRate: json["tax_rate"] as? Double ?? 0,
            taxAmount: json["tax_amount"] as? Double ?? 0,
            total: json["total"] as? Double ?? 0,
            notes: json["notes"] as? String,
            terms: json["terms"] as? String ?? "Valid for 30 days",
            expiresAt: json["expires_at"] as? String,
            createdAt: json["created_at"] as? String
        )
    }
}
