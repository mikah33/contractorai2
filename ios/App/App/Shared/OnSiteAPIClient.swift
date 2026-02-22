import Foundation

struct OnSiteAPIClient {

    enum APIError: LocalizedError {
        case notAuthenticated
        case refreshFailed
        case networkError(String)
        case serverError(Int, String)

        var errorDescription: String? {
            switch self {
            case .notAuthenticated:
                return "Please open OnSite and log in first."
            case .refreshFailed:
                return "Your session has expired. Please open OnSite and log in again."
            case .networkError(let msg):
                return "Network error: \(msg)"
            case .serverError(let code, let msg):
                return "Server error (\(code)): \(msg)"
            }
        }
    }

    static func sendChatMessage(_ text: String) async throws -> String {
        guard let accessToken = KeychainHelper.read(key: OnSiteConfig.keychainAccessToken) else {
            throw APIError.notAuthenticated
        }

        do {
            return try await performChatRequest(text, accessToken: accessToken)
        } catch APIError.serverError(401, _) {
            // Try token refresh
            let newToken = try await refreshToken()
            return try await performChatRequest(text, accessToken: newToken)
        }
    }

    private static func performChatRequest(_ text: String, accessToken: String) async throws -> String {
        let urlString = OnSiteConfig.supabaseURL + OnSiteConfig.chatFunctionPath
        guard let url = URL(string: urlString) else {
            throw APIError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(OnSiteConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "messages": [
                ["role": "user", "content": text]
            ],
            "currentEstimate": [] as [Any]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.networkError("Invalid response")
        }

        if httpResponse.statusCode == 401 {
            throw APIError.serverError(401, "Unauthorized")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(httpResponse.statusCode, body)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let message = json["message"] as? String else {
            return String(data: data, encoding: .utf8) ?? "No response"
        }

        return message
    }

    private static func refreshToken() async throws -> String {
        guard let refreshToken = KeychainHelper.read(key: OnSiteConfig.keychainRefreshToken) else {
            throw APIError.notAuthenticated
        }

        let urlString = OnSiteConfig.supabaseURL + OnSiteConfig.tokenRefreshPath
        guard let url = URL(string: urlString) else {
            throw APIError.refreshFailed
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(OnSiteConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 15

        let body: [String: Any] = [
            "refresh_token": refreshToken
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            // Clear stale tokens
            KeychainHelper.delete(key: OnSiteConfig.keychainAccessToken)
            KeychainHelper.delete(key: OnSiteConfig.keychainRefreshToken)
            throw APIError.refreshFailed
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let newAccessToken = json["access_token"] as? String,
              let newRefreshToken = json["refresh_token"] as? String else {
            throw APIError.refreshFailed
        }

        // Save new tokens
        _ = KeychainHelper.save(key: OnSiteConfig.keychainAccessToken, value: newAccessToken)
        _ = KeychainHelper.save(key: OnSiteConfig.keychainRefreshToken, value: newRefreshToken)

        return newAccessToken
    }
}
