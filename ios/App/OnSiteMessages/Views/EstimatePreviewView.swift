import SwiftUI

struct EstimatePreviewView: View {
    let estimate: Estimate
    var onDismiss: (() -> Void)? = nil

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    headerBar
                    estimateContent
                }
            }
        }
        .preferredColorScheme(.light)
    }

    // MARK: - Header Bar

    private var headerBar: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Estimate Preview")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(OnSiteTheme.textPrimary)
                Spacer()
                Button("Done") {
                    if let onDismiss = onDismiss {
                        onDismiss()
                    } else {
                        dismiss()
                    }
                }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(OnSiteTheme.accent)
            }
            .padding(16)
        }
    }

    // MARK: - Content

    private var estimateContent: some View {
        VStack(spacing: 16) {
            // Branded card header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("OnSite")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(OnSiteTheme.textPrimary)
                        Text("ESTIMATE")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(OnSiteTheme.accent)
                            .tracking(2)
                    }
                    Spacer()
                    Text("#\(String(estimate.id.suffix(6)).uppercased())")
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundColor(OnSiteTheme.textMuted)
                }

                Divider().background(OnSiteTheme.borderDefault)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(estimate.title)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(OnSiteTheme.textPrimary)

                        if let clientName = estimate.clientName, !clientName.isEmpty {
                            Text("Client: \(clientName)")
                                .font(.system(size: 13))
                                .foregroundColor(OnSiteTheme.textSecondary)
                        }
                    }
                    Spacer()

                    statusBadge
                }
            }
            .padding(16)
            .onSiteCard()

            // Line items
            VStack(spacing: 8) {
                HStack {
                    Text("Line Items")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(OnSiteTheme.textPrimary)
                    Spacer()
                    Text("\(estimate.items.count) items")
                        .font(.system(size: 12))
                        .foregroundColor(OnSiteTheme.textMuted)
                }

                ForEach(estimate.items) { item in
                    previewItemRow(item)
                }
            }
            .padding(16)
            .onSiteCard()

            // Totals
            VStack(spacing: 8) {
                totalRow(label: "Subtotal", value: estimate.subtotal, isBold: false)

                if estimate.taxRate > 0 {
                    totalRow(label: "Tax (\(String(format: "%.1f", estimate.taxRate))%)", value: estimate.taxAmount, isBold: false)
                }

                Divider().background(OnSiteTheme.borderDefault)

                totalRow(label: "Total", value: estimate.total, isBold: true)
            }
            .padding(16)
            .onSiteCard()

            // Notes
            if let notes = estimate.notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Notes")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(OnSiteTheme.accent)
                    Text(notes)
                        .font(.system(size: 13))
                        .foregroundColor(OnSiteTheme.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .onSiteCard()
            }

            // Terms
            Text(estimate.terms)
                .font(.system(size: 11))
                .foregroundColor(OnSiteTheme.textDisabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 4)
        }
        .padding(16)
    }

    // MARK: - Components

    private var statusBadge: some View {
        Text(estimate.status.displayName)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Color(hex: estimate.status.color))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Color(hex: estimate.status.color).opacity(0.1))
            .cornerRadius(OnSiteTheme.radiusSm)
    }

    private func previewItemRow(_ item: EstimateItem) -> some View {
        HStack(spacing: 8) {
            Image(systemName: item.type.icon)
                .font(.system(size: 11))
                .foregroundColor(OnSiteTheme.accent)
                .frame(width: 22, height: 22)
                .background(OnSiteTheme.accent.opacity(0.1))
                .cornerRadius(4)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.description)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(OnSiteTheme.textPrimary)
                    .lineLimit(1)

                let qty = item.quantity.truncatingRemainder(dividingBy: 1) == 0
                    ? String(format: "%.0f", item.quantity)
                    : String(format: "%.1f", item.quantity)
                Text("\(qty) \(item.unit) @ \(item.unitPrice.currencyFormatted)")
                    .font(.system(size: 10))
                    .foregroundColor(OnSiteTheme.textMuted)
            }

            Spacer()

            Text(item.totalPrice.currencyFormatted)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(OnSiteTheme.textPrimary)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(OnSiteTheme.bgElevated)
        .cornerRadius(OnSiteTheme.radiusMd)
    }

    private func totalRow(label: String, value: Double, isBold: Bool) -> some View {
        HStack {
            Text(label)
                .font(.system(size: isBold ? 16 : 13, weight: isBold ? .bold : .regular))
                .foregroundColor(isBold ? OnSiteTheme.textPrimary : OnSiteTheme.textSecondary)
            Spacer()
            Text(value.currencyFormatted)
                .font(.system(size: isBold ? 18 : 13, weight: isBold ? .bold : .regular))
                .foregroundColor(isBold ? OnSiteTheme.accent : OnSiteTheme.textPrimary)
        }
    }
}
