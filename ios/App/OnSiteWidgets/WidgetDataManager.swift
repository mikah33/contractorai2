import Foundation

struct WidgetDataManager {
    static let suiteName = "group.com.elevated.contractorai"

    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    struct RecentLead: Codable {
        let id: String
        let name: String
        let source: String
        let calculatorType: String?
        let estimatedValue: Double?
        let createdAt: String
        let outreachCount: Int?
        let totalOutreach: Int?
        let actionLabel: String?
    }

    static func getNewLeadsCount() -> Int {
        sharedDefaults?.integer(forKey: "leads_new_count") ?? 0
    }

    static func getRecentLeads() -> [RecentLead] {
        guard let data = sharedDefaults?.data(forKey: "leads_recent"),
              let leads = try? JSONDecoder().decode([RecentLead].self, from: data) else {
            return []
        }
        return leads
    }
}
