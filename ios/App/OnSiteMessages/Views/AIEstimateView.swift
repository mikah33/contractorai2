import SwiftUI

struct AIEstimateView: View {
    @ObservedObject var viewModel: EstimateViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var inputText: String = ""
    @State private var isThinking = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            VStack(spacing: 0) {
                headerBar
                chatMessages
                inputBar
            }
        }
        .preferredColorScheme(.light)
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16))
                    .foregroundColor(OnSiteTheme.accent)
                Text("AI Estimate Builder")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(OnSiteTheme.textPrimary)
            }
            Spacer()

            if !viewModel.aiEstimateItems.isEmpty {
                Button(action: {
                    viewModel.acceptAIItems()
                    dismiss()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark")
                        Text("Add \(viewModel.aiEstimateItems.count)")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(OnSiteTheme.accentGradient)
                    .cornerRadius(OnSiteTheme.radiusLg)
                }
            }

            Button("Done") { dismiss() }
                .font(.system(size: 14))
                .foregroundColor(OnSiteTheme.textSecondary)
                .padding(.leading, 4)
        }
        .padding(16)
        .background(OnSiteTheme.bgSurface)
    }

    // MARK: - Chat Messages

    private var chatMessages: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    // Welcome message
                    assistantBubble(
                        "Tell me what you're working on and I'll build the estimate. For example:\n\n\"I need to build a 12x16 deck with composite decking\"\n\n\"Roof replacement, 2000 sq ft, architectural shingles\"\n\n\"Paint 3 bedrooms, about 400 sq ft each\""
                    )
                    .id("welcome")

                    ForEach(viewModel.aiChatMessages) { msg in
                        if msg.role == "user" {
                            userBubble(msg.content)
                                .id(msg.id)
                        } else {
                            assistantBubble(msg.content)
                                .id(msg.id)
                        }
                    }

                    // AI-generated items preview
                    if !viewModel.aiEstimateItems.isEmpty {
                        aiItemsPreview
                            .id("items-preview")
                    }

                    if isThinking {
                        thinkingIndicator
                            .id("thinking")
                    }
                }
                .padding(16)
            }
            .onChange(of: viewModel.aiChatMessages.count) { _ in
                withAnimation {
                    if let last = viewModel.aiChatMessages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .onChange(of: isThinking) { thinking in
                if thinking {
                    withAnimation {
                        proxy.scrollTo("thinking", anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Bubbles

    private func userBubble(_ text: String) -> some View {
        HStack {
            Spacer()
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.white)
                .padding(12)
                .background(OnSiteTheme.primary)
                .cornerRadius(OnSiteTheme.radiusXl)
                .cornerRadius(OnSiteTheme.radiusXl, corners: .topRight, radius: 4)
        }
    }

    private func assistantBubble(_ text: String) -> some View {
        HStack {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundColor(OnSiteTheme.accent)
                    .padding(.top, 2)

                Text(text)
                    .font(.system(size: 14))
                    .foregroundColor(OnSiteTheme.textPrimary)
                    .lineSpacing(2)
            }
            .padding(12)
            .background(OnSiteTheme.bgSurface)
            .cornerRadius(OnSiteTheme.radiusXl)
            Spacer()
        }
    }

    private var thinkingIndicator: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundColor(OnSiteTheme.accent)
                ProgressView()
                    .tint(OnSiteTheme.accent)
                    .scaleEffect(0.8)
                Text("Generating estimate...")
                    .font(.system(size: 13))
                    .foregroundColor(OnSiteTheme.textMuted)
            }
            .padding(12)
            .background(OnSiteTheme.bgSurface)
            .cornerRadius(OnSiteTheme.radiusXl)
            Spacer()
        }
    }

    // MARK: - AI Items Preview

    private var aiItemsPreview: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "list.bullet.clipboard")
                    .foregroundColor(OnSiteTheme.accent)
                Text("Generated Line Items")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(OnSiteTheme.textPrimary)
                Spacer()
                Text(aiItemsTotal.currencyFormatted)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(OnSiteTheme.accent)
            }

            ForEach(viewModel.aiEstimateItems) { item in
                HStack(spacing: 8) {
                    Image(systemName: item.type.icon)
                        .font(.system(size: 10))
                        .foregroundColor(OnSiteTheme.accent)
                        .frame(width: 20, height: 20)
                        .background(OnSiteTheme.accent.opacity(0.1))
                        .cornerRadius(4)

                    VStack(alignment: .leading, spacing: 1) {
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
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(OnSiteTheme.textPrimary)
                }
                .padding(.vertical, 4)
            }

            Button(action: {
                viewModel.acceptAIItems()
                dismiss()
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                    Text("Add All to Estimate")
                }
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(OnSiteTheme.accentGradient)
                .cornerRadius(OnSiteTheme.radiusLg)
                .shadow(color: OnSiteTheme.glowAccent, radius: 6, x: 0, y: 2)
            }
            .padding(.top, 4)
        }
        .padding(14)
        .background(OnSiteTheme.bgSurface)
        .cornerRadius(OnSiteTheme.radiusXl)
        .overlay(
            RoundedRectangle(cornerRadius: OnSiteTheme.radiusXl)
                .stroke(OnSiteTheme.accent.opacity(0.2), lineWidth: 1)
        )
    }

    private var aiItemsTotal: Double {
        viewModel.aiEstimateItems.reduce(0) { $0 + $1.totalPrice }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Describe your project...", text: $inputText, axis: .vertical)
                .lineLimit(1...4)
                .font(.system(size: 14))
                .foregroundColor(OnSiteTheme.textPrimary)
                .focused($isInputFocused)
                .padding(10)
                .background(OnSiteTheme.bgElevated)
                .cornerRadius(OnSiteTheme.radiusXl)
                .overlay(
                    RoundedRectangle(cornerRadius: OnSiteTheme.radiusXl)
                        .stroke(isInputFocused ? OnSiteTheme.accent.opacity(0.5) : OnSiteTheme.borderDefault, lineWidth: 1)
                )

            Button(action: sendMessage) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                     ? OnSiteTheme.textDisabled
                                     : OnSiteTheme.accent)
            }
            .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isThinking)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(OnSiteTheme.bgSurface)
    }

    // MARK: - Send

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        inputText = ""
        isThinking = true

        Task {
            await viewModel.sendAIChatMessage(text)
            isThinking = false
        }
    }
}

// MARK: - Custom Corner Radius

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner, radius smallRadius: CGFloat) -> some View {
        self // Simplified — SwiftUI doesn't easily support per-corner, keeping uniform
    }
}
