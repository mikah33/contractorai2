import SwiftUI

struct LineItemEditorView: View {
    let item: EstimateItem?
    let onSave: (EstimateItem) -> Void
    let onCancel: () -> Void

    @State private var description: String = ""
    @State private var quantity: String = "1"
    @State private var unit: String = "ea"
    @State private var unitPrice: String = ""
    @State private var type: ItemType = .material
    @State private var notes: String = ""

    @FocusState private var focusedField: Field?

    enum Field {
        case description, quantity, unit, unitPrice, notes
    }

    var isEditing: Bool { item != nil }

    var calculatedTotal: Double {
        (Double(quantity) ?? 0) * (Double(unitPrice) ?? 0)
    }

    var body: some View {
        ZStack {
            OnSiteTheme.bgPrimary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        Text(isEditing ? "Edit Item" : "Add Item")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(OnSiteTheme.textPrimary)
                        Spacer()
                        Button("Cancel") { onCancel() }
                            .font(.system(size: 14))
                            .foregroundColor(OnSiteTheme.textSecondary)
                    }
                    .padding(.top, 8)

                    // Type Picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Type")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(OnSiteTheme.textSecondary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(ItemType.allCases.filter { $0 != .section }, id: \.self) { itemType in
                                    typeChip(itemType)
                                }
                            }
                        }
                    }

                    // Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Description")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(OnSiteTheme.textSecondary)
                        TextField("", text: $description, prompt: Text("e.g. Pressure-treated lumber 2x6").foregroundColor(OnSiteTheme.textDisabled))
                            .focused($focusedField, equals: .description)
                            .onSiteInput(isFocused: focusedField == .description)
                    }

                    // Quantity + Unit
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Quantity")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(OnSiteTheme.textSecondary)
                            TextField("", text: $quantity, prompt: Text("1").foregroundColor(OnSiteTheme.textDisabled))
                                .keyboardType(.decimalPad)
                                .focused($focusedField, equals: .quantity)
                                .onSiteInput(isFocused: focusedField == .quantity)
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Unit")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(OnSiteTheme.textSecondary)
                            TextField("", text: $unit, prompt: Text("ea").foregroundColor(OnSiteTheme.textDisabled))
                                .focused($focusedField, equals: .unit)
                                .onSiteInput(isFocused: focusedField == .unit)
                        }
                    }

                    // Unit Price
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Unit Price ($)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(OnSiteTheme.textSecondary)
                        TextField("", text: $unitPrice, prompt: Text("0.00").foregroundColor(OnSiteTheme.textDisabled))
                            .keyboardType(.decimalPad)
                            .focused($focusedField, equals: .unitPrice)
                            .onSiteInput(isFocused: focusedField == .unitPrice)
                    }

                    // Calculated Total
                    HStack {
                        Text("Item Total")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(OnSiteTheme.textSecondary)
                        Spacer()
                        Text(calculatedTotal.currencyFormatted)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(OnSiteTheme.accent)
                    }
                    .padding(12)
                    .background(OnSiteTheme.bgSurface)
                    .cornerRadius(OnSiteTheme.radiusLg)

                    // Notes
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Notes (optional)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(OnSiteTheme.textSecondary)
                        TextField("", text: $notes, prompt: Text("Additional details...").foregroundColor(OnSiteTheme.textDisabled), axis: .vertical)
                            .lineLimit(2...4)
                            .focused($focusedField, equals: .notes)
                            .onSiteInput(isFocused: focusedField == .notes)
                    }

                    // Save Button
                    Button(action: saveItem) {
                        HStack(spacing: 6) {
                            Image(systemName: isEditing ? "checkmark" : "plus.circle.fill")
                            Text(isEditing ? "Update Item" : "Add Item")
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(OnSiteTheme.accentGradient)
                        .cornerRadius(OnSiteTheme.radiusLg)
                        .shadow(color: OnSiteTheme.glowAccent, radius: 8, x: 0, y: 2)
                    }
                    .disabled(description.isEmpty || unitPrice.isEmpty)
                    .opacity(description.isEmpty || unitPrice.isEmpty ? 0.5 : 1)
                }
                .padding(16)
            }
        }
        .preferredColorScheme(.light)
        .onAppear {
            if let item = item {
                description = item.description
                quantity = item.quantity.truncatingRemainder(dividingBy: 1) == 0
                    ? String(format: "%.0f", item.quantity)
                    : String(format: "%.1f", item.quantity)
                unit = item.unit
                unitPrice = String(format: "%.2f", item.unitPrice)
                type = item.type
                notes = item.notes ?? ""
            } else {
                unit = type.defaultUnit
            }
        }
    }

    // MARK: - Type Chip

    private func typeChip(_ itemType: ItemType) -> some View {
        Button(action: {
            type = itemType
            if unit == type.defaultUnit || unit.isEmpty {
                unit = itemType.defaultUnit
            }
        }) {
            HStack(spacing: 4) {
                Image(systemName: itemType.icon)
                    .font(.system(size: 11))
                Text(itemType.displayName)
                    .font(.system(size: 12, weight: .medium))
            }
            .foregroundColor(type == itemType ? .white : OnSiteTheme.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(type == itemType ? OnSiteTheme.accentGradient : LinearGradient(colors: [OnSiteTheme.bgOverlay], startPoint: .leading, endPoint: .trailing))
            .cornerRadius(OnSiteTheme.radiusLg)
            .overlay(
                RoundedRectangle(cornerRadius: OnSiteTheme.radiusLg)
                    .stroke(type == itemType ? Color.clear : OnSiteTheme.borderDefault, lineWidth: 1)
            )
        }
    }

    // MARK: - Save

    private func saveItem() {
        let newItem = EstimateItem(
            id: item?.id ?? UUID().uuidString,
            description: description,
            quantity: Double(quantity) ?? 1,
            unit: unit,
            unitPrice: Double(unitPrice) ?? 0,
            totalPrice: calculatedTotal,
            type: type,
            notes: notes.isEmpty ? nil : notes
        )
        onSave(newItem)
    }
}
