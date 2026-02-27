import SwiftUI

struct OnSiteTheme {
    // Primary palette — OnSite blue
    static let primary = Color(hex: "#043d6b")
    static let primaryLight = Color(hex: "#035291")
    static let primaryDark = Color(hex: "#022a4a")
    static let accent = Color(hex: "#043d6b")
    static let accentBright = Color(hex: "#035291")
    static let accentLight = Color(hex: "#0a6db5")
    static let secondary = Color(hex: "#14B8A6")
    static let secondaryBright = Color(hex: "#2DD4BF")

    // Backgrounds — light mode
    static let bgDeep = Color.white
    static let bgPrimary = Color.white
    static let bgElevated = Color(hex: "#F5F5F5")
    static let bgSurface = Color(hex: "#F9FAFB")
    static let bgOverlay = Color(hex: "#F3F4F6")

    // Text — dark on light
    static let textPrimary = Color.black
    static let textSecondary = Color.black
    static let textMuted = Color(hex: "#374151")
    static let textDisabled = Color(hex: "#6B7280")

    // Borders
    static let borderSubtle = Color(hex: "#E5E7EB")
    static let borderDefault = Color(hex: "#D1D5DB")
    static let borderStrong = Color(hex: "#9CA3AF")

    // Status
    static let success = Color(hex: "#16A34A")
    static let warning = Color(hex: "#CA8A04")
    static let error = Color(hex: "#DC2626")

    // Gradients — blue
    static let accentGradient = LinearGradient(
        colors: [Color(hex: "#043d6b"), Color(hex: "#035291")],
        startPoint: .leading,
        endPoint: .trailing
    )

    static let primaryGradient = LinearGradient(
        colors: [Color(hex: "#043d6b"), Color(hex: "#065a9e")],
        startPoint: .top,
        endPoint: .bottom
    )

    // Corner radius
    static let radiusSm: CGFloat = 4
    static let radiusMd: CGFloat = 6
    static let radiusLg: CGFloat = 8
    static let radiusXl: CGFloat = 12
    static let radius2xl: CGFloat = 16

    // Shadows
    static let shadowCard = Color.black.opacity(0.06)
    static let shadowElevated = Color.black.opacity(0.1)
    static let glowAccent = Color(hex: "#043d6b").opacity(0.15)
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Styled View Modifiers

struct OnSiteCardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.white)
            .cornerRadius(OnSiteTheme.radiusXl)
            .shadow(color: OnSiteTheme.shadowCard, radius: 6, x: 0, y: 2)
    }
}

struct OnSiteInputModifier: ViewModifier {
    var isFocused: Bool = false

    func body(content: Content) -> some View {
        content
            .foregroundColor(.black)
            .tint(.black)
            .padding(12)
            .background(Color.white)
            .cornerRadius(OnSiteTheme.radiusLg)
            .overlay(
                RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                    .stroke(isFocused ? OnSiteTheme.primary : OnSiteTheme.borderDefault, lineWidth: 1)
            )
    }
}

extension View {
    func onSiteCard() -> some View {
        modifier(OnSiteCardModifier())
    }

    func onSiteInput(isFocused: Bool = false) -> some View {
        modifier(OnSiteInputModifier(isFocused: isFocused))
    }
}
