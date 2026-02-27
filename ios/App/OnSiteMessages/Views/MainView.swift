import SwiftUI

struct MainView: View {
    @ObservedObject var viewModel: EstimateViewModel
    let isCompact: Bool
    let onRequestExpand: () -> Void
    let onSendEstimate: (Estimate) -> Void

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            if !viewModel.isAuthenticated {
                notAuthenticatedView
            } else if isCompact {
                compactView
            } else {
                EstimateBuilderView(
                    viewModel: viewModel,
                    onSend: onSendEstimate
                )
            }
        }
        .preferredColorScheme(.light)
    }

    // MARK: - Compact View

    private var compactView: some View {
        VStack(spacing: 12) {
            Button(action: onRequestExpand) {
                HStack(spacing: 10) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 18))
                    Text("Create Estimate")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(OnSiteTheme.accentGradient)
                .cornerRadius(OnSiteTheme.radiusLg)
                .shadow(color: OnSiteTheme.glowAccent, radius: 8, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Not Authenticated View

    private var notAuthenticatedView: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(OnSiteTheme.primary.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 36))
                    .foregroundColor(OnSiteTheme.accent)
            }

            VStack(spacing: 8) {
                Text("Sign In Required")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(OnSiteTheme.textPrimary)

                Text("Open OnSite and sign in to create and send estimates via iMessage.")
                    .font(.system(size: 14))
                    .foregroundColor(OnSiteTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
            }
        }
        .padding(32)
    }
}
