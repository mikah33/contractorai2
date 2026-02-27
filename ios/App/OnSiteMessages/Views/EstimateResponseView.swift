import SwiftUI

struct EstimateResponseView: View {
    let estimateId: String
    var initialEstimate: Estimate? = nil
    let onAccept: () -> Void
    let onDecline: () -> Void
    var onOpenURL: ((URL) -> Void)? = nil

    @StateObject private var viewModel = EstimateViewModel()
    @State private var responded = false
    @State private var responseAction: String?
    @State private var paymentURL: String?
    @State private var loadingPayment = false

    private let apiService = EstimateAPIService()

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            if viewModel.estimate.title.isEmpty && initialEstimate == nil && viewModel.isLoading {
                loadingView
            } else if let error = viewModel.errorMessage, viewModel.estimate.title.isEmpty, initialEstimate == nil {
                errorView(error)
            } else {
                responseContent
            }
        }
        .preferredColorScheme(.light)
        .onAppear {
            // Use URL-encoded data immediately if available
            if let est = initialEstimate {
                viewModel.estimate = est
            }
        }
        .task {
            // Try API load as enhancement (may fail for recipients without auth)
            if initialEstimate == nil {
                await viewModel.loadEstimate(id: estimateId)
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(OnSiteTheme.accent)
                .scaleEffect(1.2)
            Text("Loading estimate...")
                .font(.system(size: 14))
                .foregroundColor(OnSiteTheme.textSecondary)
        }
    }

    // MARK: - Error

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 36))
                .foregroundColor(OnSiteTheme.error)
            Text("Unable to load estimate")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(OnSiteTheme.textPrimary)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(OnSiteTheme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
    }

    // MARK: - Response Content

    private var responseContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Brand header
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.text.fill")
                            .foregroundColor(OnSiteTheme.accent)
                        Text("OnSite Estimate")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(OnSiteTheme.textPrimary)
                    }
                    Spacer()
                }
                .padding(16)

                // Estimate summary card
                VStack(spacing: 16) {
                    VStack(spacing: 8) {
                        Text(viewModel.estimate.title)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(OnSiteTheme.textPrimary)
                            .multilineTextAlignment(.center)

                        Text(viewModel.estimate.total.currencyFormatted)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(OnSiteTheme.accent)

                        Text("\(viewModel.estimate.items.count) line items")
                            .font(.system(size: 13))
                            .foregroundColor(OnSiteTheme.textMuted)
                    }

                    Divider().background(OnSiteTheme.borderDefault)

                    // Item summary
                    ForEach(viewModel.estimate.items) { item in
                        HStack {
                            Text(item.description)
                                .font(.system(size: 12))
                                .foregroundColor(OnSiteTheme.textSecondary)
                                .lineLimit(1)
                            Spacer()
                            Text(item.totalPrice.currencyFormatted)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(OnSiteTheme.textPrimary)
                        }
                    }

                    Divider().background(OnSiteTheme.borderDefault)

                    // Totals
                    HStack {
                        Text("Subtotal")
                            .font(.system(size: 13))
                            .foregroundColor(OnSiteTheme.textSecondary)
                        Spacer()
                        Text(viewModel.estimate.subtotal.currencyFormatted)
                            .font(.system(size: 13))
                            .foregroundColor(OnSiteTheme.textPrimary)
                    }

                    if viewModel.estimate.taxRate > 0 {
                        HStack {
                            Text("Tax (\(String(format: "%.1f", viewModel.estimate.taxRate))%)")
                                .font(.system(size: 13))
                                .foregroundColor(OnSiteTheme.textSecondary)
                            Spacer()
                            Text(viewModel.estimate.taxAmount.currencyFormatted)
                                .font(.system(size: 13))
                                .foregroundColor(OnSiteTheme.textPrimary)
                        }
                    }

                    HStack {
                        Text("Total")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(OnSiteTheme.textPrimary)
                        Spacer()
                        Text(viewModel.estimate.total.currencyFormatted)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(OnSiteTheme.accent)
                    }

                    // Notes
                    if let notes = viewModel.estimate.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Notes")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(OnSiteTheme.accent)
                            Text(notes)
                                .font(.system(size: 12))
                                .foregroundColor(OnSiteTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(20)
                .onSiteCard()
                .padding(.horizontal, 16)

                // Action buttons or response state
                if responded {
                    respondedView
                } else {
                    actionButtonsView
                }

                // Terms
                Text(viewModel.estimate.terms)
                    .font(.system(size: 10))
                    .foregroundColor(OnSiteTheme.textDisabled)
                    .padding(.horizontal, 16)
            }
            .padding(.bottom, 20)
        }
    }

    // MARK: - Action Buttons

    private var actionButtonsView: some View {
        VStack(spacing: 10) {
            Button(action: {
                Task {
                    let success = await viewModel.respondToEstimate(id: estimateId, action: "approve")
                    if success {
                        responded = true
                        responseAction = "approve"
                        onAccept()

                        // Fetch Stripe payment link
                        loadingPayment = true
                        do {
                            // Small delay to let the edge function create the Stripe session
                            try await Task.sleep(nanoseconds: 2_000_000_000)
                            paymentURL = try await apiService.getPaymentLink(estimateId: estimateId)
                        } catch {
                            // Payment link fetch failed silently — not critical
                        }
                        loadingPayment = false
                    }
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Approve Estimate")
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(OnSiteTheme.success)
                .cornerRadius(OnSiteTheme.radiusLg)
                .shadow(color: OnSiteTheme.success.opacity(0.3), radius: 8, x: 0, y: 2)
            }

            Button(action: {
                Task {
                    let success = await viewModel.respondToEstimate(id: estimateId, action: "decline")
                    if success {
                        responded = true
                        responseAction = "decline"
                        onDecline()
                    }
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "xmark.circle.fill")
                    Text("Decline Estimate")
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(OnSiteTheme.error)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(OnSiteTheme.error.opacity(0.1))
                .cornerRadius(OnSiteTheme.radiusLg)
                .overlay(
                    RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                        .stroke(OnSiteTheme.error.opacity(0.3), lineWidth: 1)
                )
            }
        }
        .padding(.horizontal, 16)
        .disabled(viewModel.isLoading)
        .opacity(viewModel.isLoading ? 0.6 : 1)
    }

    // MARK: - Responded View

    private var respondedView: some View {
        VStack(spacing: 16) {
            Image(systemName: responseAction == "approve" ? "checkmark.seal.fill" : "xmark.circle.fill")
                .font(.system(size: 36))
                .foregroundColor(responseAction == "approve" ? OnSiteTheme.success : OnSiteTheme.error)

            Text(responseAction == "approve" ? "Estimate Approved!" : "Estimate Declined")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(OnSiteTheme.textPrimary)

            if responseAction == "approve" {
                if loadingPayment {
                    HStack(spacing: 8) {
                        ProgressView()
                            .tint(OnSiteTheme.accent)
                            .scaleEffect(0.8)
                        Text("Generating payment link...")
                            .font(.system(size: 13))
                            .foregroundColor(OnSiteTheme.textSecondary)
                    }
                } else if let url = paymentURL, let payURL = URL(string: url) {
                    VStack(spacing: 12) {
                        Text("Pay securely with Stripe")
                            .font(.system(size: 13))
                            .foregroundColor(OnSiteTheme.textSecondary)

                        Button(action: {
                            onOpenURL?(payURL)
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "creditcard.fill")
                                Text("Pay Now — \(viewModel.estimate.total.currencyFormatted)")
                            }
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(OnSiteTheme.accentGradient)
                            .cornerRadius(OnSiteTheme.radiusLg)
                            .shadow(color: OnSiteTheme.glowAccent, radius: 8, x: 0, y: 2)
                        }

                        Button(action: {
                            UIPasteboard.general.string = url
                        }) {
                            HStack(spacing: 4) {
                                Image(systemName: "doc.on.doc")
                                Text("Copy payment link")
                            }
                            .font(.system(size: 12))
                            .foregroundColor(OnSiteTheme.textMuted)
                        }
                    }
                } else {
                    Text("The contractor has been notified and will follow up with payment details.")
                        .font(.system(size: 13))
                        .foregroundColor(OnSiteTheme.textSecondary)
                        .multilineTextAlignment(.center)
                }
            } else {
                Text("The contractor has been notified of your decision.")
                    .font(.system(size: 13))
                    .foregroundColor(OnSiteTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(24)
    }
}
