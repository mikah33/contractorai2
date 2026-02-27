import Foundation

// MARK: - Estimate

struct Estimate: Codable, Identifiable {
    var id: String
    var title: String
    var clientName: String?
    var projectName: String?
    var status: EstimateStatus
    var items: [EstimateItem]
    var subtotal: Double
    var taxRate: Double      // Percentage (e.g., 8.5 = 8.5%)
    var taxAmount: Double    // Calculated: subtotal * (taxRate / 100)
    var total: Double        // Calculated: subtotal + taxAmount
    var notes: String?
    var terms: String
    var expiresAt: String?
    var createdAt: String?

    init(
        id: String = UUID().uuidString,
        title: String = "",
        clientName: String? = nil,
        projectName: String? = nil,
        status: EstimateStatus = .draft,
        items: [EstimateItem] = [],
        subtotal: Double = 0,
        taxRate: Double = 0,
        taxAmount: Double = 0,
        total: Double = 0,
        notes: String? = nil,
        terms: String = "Valid for 30 days",
        expiresAt: String? = nil,
        createdAt: String? = nil
    ) {
        self.id = id
        self.title = title
        self.clientName = clientName
        self.projectName = projectName
        self.status = status
        self.items = items
        self.subtotal = subtotal
        self.taxRate = taxRate
        self.taxAmount = taxAmount
        self.total = total
        self.notes = notes
        self.terms = terms
        self.createdAt = createdAt

        if let expiresAt = expiresAt {
            self.expiresAt = expiresAt
        } else {
            let expiry = Calendar.current.date(byAdding: .day, value: 30, to: Date()) ?? Date()
            self.expiresAt = ISO8601DateFormatter().string(from: expiry)
        }
    }

    mutating func recalculate() {
        for i in items.indices {
            items[i].totalPrice = items[i].quantity * items[i].unitPrice
        }
        subtotal = items.reduce(0) { $0 + $1.totalPrice }
        taxAmount = subtotal * (taxRate / 100)
        total = subtotal + taxAmount
    }
}

// MARK: - EstimateItem

struct EstimateItem: Codable, Identifiable {
    var id: String
    var description: String
    var quantity: Double
    var unit: String
    var unitPrice: Double
    var totalPrice: Double   // Calculated: quantity * unitPrice
    var type: ItemType
    var notes: String?

    init(
        id: String = UUID().uuidString,
        description: String = "",
        quantity: Double = 1,
        unit: String = "ea",
        unitPrice: Double = 0,
        totalPrice: Double = 0,
        type: ItemType = .material,
        notes: String? = nil
    ) {
        self.id = id
        self.description = description
        self.quantity = quantity
        self.unit = unit
        self.unitPrice = unitPrice
        self.totalPrice = totalPrice
        self.type = type
        self.notes = notes
    }
}

// MARK: - Enums

enum EstimateStatus: String, Codable, CaseIterable {
    case draft
    case sent
    case approved
    case rejected
    case expired

    var displayName: String {
        rawValue.capitalized
    }

    var color: String {
        switch self {
        case .draft: return "#71717A"
        case .sent: return "#FBBF24"
        case .approved: return "#34D399"
        case .rejected: return "#F87171"
        case .expired: return "#A1A1AA"
        }
    }
}

enum ItemType: String, Codable, CaseIterable {
    case material
    case labor
    case equipment
    case other
    case section

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .material: return "shippingbox"
        case .labor: return "person.fill"
        case .equipment: return "wrench.and.screwdriver"
        case .other: return "ellipsis.circle"
        case .section: return "text.alignleft"
        }
    }

    var defaultUnit: String {
        switch self {
        case .material: return "ea"
        case .labor: return "hr"
        case .equipment: return "day"
        case .other: return "ea"
        case .section: return ""
        }
    }
}

// MARK: - Client

struct Client: Codable, Identifiable {
    let id: String
    let name: String
    var email: String
    var phone: String
    var company: String?
}

// MARK: - Currency Formatting

extension Double {
    var currencyFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        return formatter.string(from: NSNumber(value: self)) ?? "$0.00"
    }
}
