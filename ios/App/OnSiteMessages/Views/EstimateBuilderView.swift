import SwiftUI

struct EstimateBuilderView: View {
    @ObservedObject var viewModel: EstimateViewModel
    let onSend: (Estimate) -> Void

    @State private var showAddItem = false
    @State private var showPreview = false
    @State private var showAIChat = false
    @State private var showClientPicker = false
    @State private var isAddingNewClient = false

    // Demo rate prompt
    @State private var demoSqFt: String = ""
    @State private var demoPricePerSqFt: String = ""

    // Labor prompt
    @State private var laborDescription: String = "Labor"
    @State private var laborHours: String = ""
    @State private var laborRate: String = ""

    @FocusState private var focusedField: Field?

    enum Field {
        case title, clientName, taxRate, notes
    }

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    headerSection
                    detailsSection
                    lineItemsSection
                    taxSection
                    notesSection
                    totalsSection
                    actionButtons
                }
                .padding(16)
            }
        }
        .sheet(isPresented: $showAddItem) {
            LineItemEditorView(
                item: viewModel.editingItemIndex != nil
                    ? viewModel.estimate.items[viewModel.editingItemIndex!]
                    : nil,
                onSave: { item in
                    if let index = viewModel.editingItemIndex {
                        viewModel.updateLineItem(at: index, with: item)
                        viewModel.editingItemIndex = nil
                    } else {
                        viewModel.addLineItem(item)
                    }
                    showAddItem = false
                },
                onCancel: {
                    viewModel.editingItemIndex = nil
                    showAddItem = false
                }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showPreview) {
            EstimatePreviewView(estimate: viewModel.estimate)
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAIChat) {
            AIEstimateView(viewModel: viewModel)
                .presentationDragIndicator(.visible)
        }
        .alert("Demo/Demolition Pricing", isPresented: $viewModel.showDemoRatePrompt) {
            TextField("Square footage", text: $demoSqFt)
                .keyboardType(.decimalPad)
            TextField("Price per sq ft", text: $demoPricePerSqFt)
                .keyboardType(.decimalPad)
            Button("Set Price") {
                if let sqFt = Double(demoSqFt), let price = Double(demoPricePerSqFt) {
                    viewModel.updateDemoRate(pricePerSqFt: price, sqFt: sqFt)
                }
                demoSqFt = ""
                demoPricePerSqFt = ""
            }
            Button("Skip", role: .cancel) {
                viewModel.showDemoRatePrompt = false
            }
        } message: {
            Text("What's your price per square foot for demo? Enter the square footage and your rate.")
        }
        .alert("Include Labor Costs?", isPresented: $viewModel.showLaborCostPrompt) {
            TextField("Description", text: $laborDescription)
            TextField("Hours", text: $laborHours)
                .keyboardType(.decimalPad)
            TextField("Hourly rate ($)", text: $laborRate)
                .keyboardType(.decimalPad)
            Button("Add Labor") {
                if let hours = Double(laborHours), let rate = Double(laborRate) {
                    viewModel.addLaborItem(description: laborDescription, hours: hours, hourlyRate: rate)
                }
                laborDescription = "Labor"
                laborHours = ""
                laborRate = ""
            }
            Button("No Thanks", role: .cancel) {
                viewModel.showLaborCostPrompt = false
            }
        } message: {
            Text("Would you like to include labor costs on this estimate? Enter your labor rate.")
        }
        .preferredColorScheme(.light)
        .task {
            await viewModel.loadClients()
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "doc.text.fill")
                    .font(.system(size: 16))
                    .foregroundColor(OnSiteTheme.accent)
                Text("New Estimate")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(OnSiteTheme.textPrimary)
            }
            Spacer()
            if viewModel.isLoading {
                ProgressView()
                    .tint(OnSiteTheme.accent)
            }
        }
    }

    // MARK: - Details

    private var detailsSection: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Title")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(OnSiteTheme.textSecondary)
                TextField("", text: $viewModel.estimate.title, prompt: Text("e.g. Deck Renovation").foregroundColor(OnSiteTheme.textDisabled))
                    .focused($focusedField, equals: .title)
                    .onSiteInput(isFocused: focusedField == .title)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Client")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(OnSiteTheme.textSecondary)

                if isAddingNewClient {
                    HStack {
                        TextField("", text: Binding(
                            get: { viewModel.estimate.clientName ?? "" },
                            set: { viewModel.estimate.clientName = $0.isEmpty ? nil : $0 }
                        ), prompt: Text("Customer name").foregroundColor(OnSiteTheme.textDisabled))
                        .focused($focusedField, equals: .clientName)
                        .onSiteInput(isFocused: focusedField == .clientName)

                        Button(action: {
                            isAddingNewClient = false
                        }) {
                            Image(systemName: "list.bullet")
                                .foregroundColor(OnSiteTheme.accent)
                                .padding(10)
                        }
                    }
                } else {
                    Menu {
                        ForEach(viewModel.clients) { client in
                            Button(action: {
                                viewModel.estimate.clientName = client.name
                            }) {
                                HStack {
                                    Text(client.name)
                                    if let company = client.company, !company.isEmpty {
                                        Text("(\(company))")
                                    }
                                }
                            }
                        }

                        Divider()

                        Button(action: {
                            isAddingNewClient = true
                            viewModel.estimate.clientName = nil
                        }) {
                            Label("Add New Client", systemImage: "plus")
                        }
                    } label: {
                        HStack {
                            Text(viewModel.estimate.clientName ?? "Select client...")
                                .foregroundColor(viewModel.estimate.clientName != nil ? .black : OnSiteTheme.textDisabled)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(OnSiteTheme.textMuted)
                        }
                        .padding(12)
                        .background(Color.white)
                        .cornerRadius(OnSiteTheme.radiusLg)
                        .overlay(
                            RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                                .stroke(OnSiteTheme.borderDefault, lineWidth: 1)
                        )
                    }
                }
            }
        }
        .padding(16)
        .onSiteCard()
    }

    // MARK: - Line Items

    private var lineItemsSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Line Items")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(OnSiteTheme.textPrimary)
                Spacer()
                Text("\(viewModel.estimate.items.count) items")
                    .font(.system(size: 12))
                    .foregroundColor(OnSiteTheme.textMuted)
            }

            if viewModel.estimate.items.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.system(size: 24))
                        .foregroundColor(OnSiteTheme.textDisabled)
                    Text("No items yet")
                        .font(.system(size: 13))
                        .foregroundColor(OnSiteTheme.textMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                ForEach(Array(viewModel.estimate.items.enumerated()), id: \.element.id) { index, item in
                    lineItemRow(item: item, index: index)
                }
                .onDelete { offsets in
                    viewModel.removeLineItem(at: offsets)
                }
            }

            HStack(spacing: 10) {
                Button(action: {
                    viewModel.editingItemIndex = nil
                    showAddItem = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Item")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(OnSiteTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(OnSiteTheme.accent.opacity(0.1))
                    .cornerRadius(OnSiteTheme.radiusLg)
                    .overlay(
                        RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                            .stroke(OnSiteTheme.accent.opacity(0.3), lineWidth: 1)
                    )
                }

                Button(action: { showAIChat = true }) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                        Text("AI Generate")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundColor(OnSiteTheme.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(OnSiteTheme.secondary.opacity(0.1))
                    .cornerRadius(OnSiteTheme.radiusLg)
                    .overlay(
                        RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                            .stroke(OnSiteTheme.secondary.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        }
        .padding(16)
        .onSiteCard()
    }

    private func lineItemRow(item: EstimateItem, index: Int) -> some View {
        Button(action: {
            viewModel.editingItemIndex = index
            showAddItem = true
        }) {
            HStack(spacing: 12) {
                Image(systemName: item.type.icon)
                    .font(.system(size: 14))
                    .foregroundColor(OnSiteTheme.accent)
                    .frame(width: 28, height: 28)
                    .background(OnSiteTheme.accent.opacity(0.1))
                    .cornerRadius(6)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.description)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(OnSiteTheme.textPrimary)
                        .lineLimit(1)

                    Text("\(formatQuantity(item.quantity)) \(item.unit) @ \(item.unitPrice.currencyFormatted)")
                        .font(.system(size: 11))
                        .foregroundColor(OnSiteTheme.textMuted)
                }

                Spacer()

                Text(item.totalPrice.currencyFormatted)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(OnSiteTheme.textPrimary)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(OnSiteTheme.bgElevated)
            .cornerRadius(OnSiteTheme.radiusLg)
        }
    }

    // MARK: - Tax

    private var taxSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Tax Rate (%)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(OnSiteTheme.textSecondary)

            HStack {
                TextField("", text: Binding(
                    get: { viewModel.estimate.taxRate == 0 ? "" : String(format: "%.1f", viewModel.estimate.taxRate) },
                    set: { viewModel.updateTaxRate(Double($0) ?? 0) }
                ), prompt: Text("0").foregroundColor(OnSiteTheme.textDisabled))
                .keyboardType(.decimalPad)
                .focused($focusedField, equals: .taxRate)
                .onSiteInput(isFocused: focusedField == .taxRate)

                Text("%")
                    .foregroundColor(OnSiteTheme.textMuted)
            }
        }
        .padding(16)
        .onSiteCard()
    }

    // MARK: - Notes

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Notes")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(OnSiteTheme.textSecondary)

            TextField("", text: Binding(
                get: { viewModel.estimate.notes ?? "" },
                set: { viewModel.estimate.notes = $0.isEmpty ? nil : $0 }
            ), prompt: Text("Additional notes...").foregroundColor(OnSiteTheme.textDisabled), axis: .vertical)
            .lineLimit(3...6)
            .focused($focusedField, equals: .notes)
            .onSiteInput(isFocused: focusedField == .notes)
        }
        .padding(16)
        .onSiteCard()
    }

    // MARK: - Totals

    private var totalsSection: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Subtotal")
                    .foregroundColor(OnSiteTheme.textSecondary)
                Spacer()
                Text(viewModel.estimate.subtotal.currencyFormatted)
                    .foregroundColor(OnSiteTheme.textPrimary)
            }
            .font(.system(size: 13))

            if viewModel.estimate.taxRate > 0 {
                HStack {
                    Text("Tax (\(String(format: "%.1f", viewModel.estimate.taxRate))%)")
                        .foregroundColor(OnSiteTheme.textSecondary)
                    Spacer()
                    Text(viewModel.estimate.taxAmount.currencyFormatted)
                        .foregroundColor(OnSiteTheme.textPrimary)
                }
                .font(.system(size: 13))
            }

            Divider()
                .background(OnSiteTheme.borderDefault)

            HStack {
                Text("Total")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(OnSiteTheme.textPrimary)
                Spacer()
                Text(viewModel.estimate.total.currencyFormatted)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(OnSiteTheme.accent)
            }
        }
        .padding(16)
        .onSiteCard()
    }

    // MARK: - Actions

    private var actionButtons: some View {
        VStack(spacing: 10) {
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(OnSiteTheme.error)
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(OnSiteTheme.error.opacity(0.1))
                    .cornerRadius(OnSiteTheme.radiusLg)
            }

            Button(action: { showPreview = true }) {
                HStack(spacing: 6) {
                    Image(systemName: "eye")
                    Text("Preview")
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(OnSiteTheme.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(OnSiteTheme.bgOverlay)
                .cornerRadius(OnSiteTheme.radiusLg)
                .overlay(
                    RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                        .stroke(OnSiteTheme.borderDefault, lineWidth: 1)
                )
            }

            Button(action: {
                Task {
                    let success = await viewModel.saveAndSend()
                    if success {
                        onSend(viewModel.estimate)
                    }
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: "paperplane.fill")
                    Text("Send Estimate")
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(OnSiteTheme.accentGradient)
                .cornerRadius(OnSiteTheme.radiusLg)
                .shadow(color: OnSiteTheme.glowAccent, radius: 8, x: 0, y: 2)
            }
            .disabled(viewModel.isLoading)
            .opacity(viewModel.isLoading ? 0.6 : 1)
        }
    }

    // MARK: - Helpers

    private func formatQuantity(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.1f", value)
    }
}
