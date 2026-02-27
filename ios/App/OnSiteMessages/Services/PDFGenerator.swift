import UIKit
import PDFKit

struct EstimatePDFGenerator {

    // OnSite brand colors as UIColor
    private static let brandBlue = UIColor(red: 4/255, green: 61/255, blue: 107/255, alpha: 1)
    private static let brandAmber = UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1)
    private static let darkBg = UIColor(red: 15/255, green: 15/255, blue: 15/255, alpha: 1)

    static func generatePDF(for estimate: Estimate) -> Data? {
        let pageRect = CGRect(x: 0, y: 0, width: 612, height: 792) // US Letter
        let margin: CGFloat = 40
        let contentWidth = pageRect.width - (margin * 2)

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)

        return renderer.pdfData { context in
            context.beginPage()

            var y: CGFloat = margin

            // --- Header bar ---
            let headerRect = CGRect(x: 0, y: 0, width: pageRect.width, height: 60)
            brandBlue.setFill()
            UIBezierPath(rect: headerRect).fill()

            let logoAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 22, weight: .bold),
                .foregroundColor: UIColor.white
            ]
            "OnSite".draw(at: CGPoint(x: margin, y: 18), withAttributes: logoAttrs)

            let estLabelAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18, weight: .semibold),
                .foregroundColor: brandAmber
            ]
            let estLabel = "ESTIMATE"
            let estSize = estLabel.size(withAttributes: estLabelAttrs)
            estLabel.draw(at: CGPoint(x: pageRect.width - margin - estSize.width, y: 20), withAttributes: estLabelAttrs)

            y = 80

            // --- Estimate title ---
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18, weight: .bold),
                .foregroundColor: UIColor.black
            ]
            estimate.title.draw(at: CGPoint(x: margin, y: y), withAttributes: titleAttrs)
            y += 28

            // --- Estimate number + date ---
            let detailAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10),
                .foregroundColor: UIColor.darkGray
            ]
            let estNumber = "#\(String(estimate.id.suffix(6)).uppercased())"
            estNumber.draw(at: CGPoint(x: margin, y: y), withAttributes: detailAttrs)

            if let createdAt = estimate.createdAt {
                let dateStr = "Created: \(formatDate(createdAt))"
                let dateSize = dateStr.size(withAttributes: detailAttrs)
                dateStr.draw(at: CGPoint(x: pageRect.width - margin - dateSize.width, y: y), withAttributes: detailAttrs)
            }
            y += 18

            if let expiresAt = estimate.expiresAt {
                let expiryStr = "Expires: \(formatDate(expiresAt))"
                let expirySize = expiryStr.size(withAttributes: detailAttrs)
                expiryStr.draw(at: CGPoint(x: pageRect.width - margin - expirySize.width, y: y), withAttributes: detailAttrs)
            }
            y += 22

            // --- Client info ---
            if let clientName = estimate.clientName, !clientName.isEmpty {
                let clientLabelAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
                    .foregroundColor: brandBlue
                ]
                "BILL TO".draw(at: CGPoint(x: margin, y: y), withAttributes: clientLabelAttrs)
                y += 16

                let clientAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 12),
                    .foregroundColor: UIColor.black
                ]
                clientName.draw(at: CGPoint(x: margin, y: y), withAttributes: clientAttrs)
                y += 24
            }

            y += 8

            // --- Divider ---
            drawDivider(at: y, width: contentWidth, margin: margin)
            y += 12

            // --- Table header ---
            drawTableHeader(at: &y, contentWidth: contentWidth, margin: margin)

            // --- Line items ---
            for (index, item) in estimate.items.enumerated() {
                if y > pageRect.height - 120 {
                    context.beginPage()
                    y = margin
                    drawTableHeader(at: &y, contentWidth: contentWidth, margin: margin)
                }
                drawLineItem(item, at: &y, contentWidth: contentWidth, margin: margin, isAlternate: index % 2 == 1)
            }

            y += 16

            // --- Divider ---
            drawDivider(at: y, width: contentWidth, margin: margin)
            y += 16

            // --- Totals ---
            let totalLabelAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor.darkGray
            ]
            let totalValueAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor.black
            ]
            let boldTotalAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14, weight: .bold),
                .foregroundColor: brandBlue
            ]

            let rightCol = pageRect.width - margin - 80
            let valueCol = pageRect.width - margin

            // Subtotal
            let subtotalLabel = "Subtotal:"
            let subtotalValue = estimate.subtotal.currencyFormatted
            subtotalLabel.draw(at: CGPoint(x: rightCol - subtotalLabel.size(withAttributes: totalLabelAttrs).width, y: y), withAttributes: totalLabelAttrs)
            subtotalValue.draw(at: CGPoint(x: valueCol - subtotalValue.size(withAttributes: totalValueAttrs).width, y: y), withAttributes: totalValueAttrs)
            y += 20

            // Tax
            if estimate.taxRate > 0 {
                let taxLabel = "Tax (\(String(format: "%.1f", estimate.taxRate))%):"
                let taxValue = estimate.taxAmount.currencyFormatted
                taxLabel.draw(at: CGPoint(x: rightCol - taxLabel.size(withAttributes: totalLabelAttrs).width, y: y), withAttributes: totalLabelAttrs)
                taxValue.draw(at: CGPoint(x: valueCol - taxValue.size(withAttributes: totalValueAttrs).width, y: y), withAttributes: totalValueAttrs)
                y += 20
            }

            // Total
            drawDivider(at: y, width: 160, margin: pageRect.width - margin - 160)
            y += 8
            let totalLabel = "Total:"
            let totalValue = estimate.total.currencyFormatted
            totalLabel.draw(at: CGPoint(x: rightCol - totalLabel.size(withAttributes: boldTotalAttrs).width, y: y), withAttributes: boldTotalAttrs)
            totalValue.draw(at: CGPoint(x: valueCol - totalValue.size(withAttributes: boldTotalAttrs).width, y: y), withAttributes: boldTotalAttrs)
            y += 30

            // --- Notes ---
            if let notes = estimate.notes, !notes.isEmpty {
                let notesLabelAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
                    .foregroundColor: brandBlue
                ]
                "NOTES".draw(at: CGPoint(x: margin, y: y), withAttributes: notesLabelAttrs)
                y += 16

                let notesRect = CGRect(x: margin, y: y, width: contentWidth, height: 80)
                notes.draw(in: notesRect, withAttributes: detailAttrs)
                y += 40
            }

            // --- Terms footer ---
            let termsAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 8),
                .foregroundColor: UIColor.lightGray
            ]
            estimate.terms.draw(at: CGPoint(x: margin, y: pageRect.height - 30), withAttributes: termsAttrs)

            // Powered by
            let poweredAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 7),
                .foregroundColor: UIColor.lightGray
            ]
            let powered = "Powered by OnSite"
            let poweredSize = powered.size(withAttributes: poweredAttrs)
            powered.draw(at: CGPoint(x: pageRect.width - margin - poweredSize.width, y: pageRect.height - 30), withAttributes: poweredAttrs)
        }
    }

    // MARK: - Drawing Helpers

    private static func drawDivider(at y: CGFloat, width: CGFloat, margin: CGFloat) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: margin, y: y))
        path.addLine(to: CGPoint(x: margin + width, y: y))
        UIColor(white: 0.85, alpha: 1).setStroke()
        path.lineWidth = 0.5
        path.stroke()
    }

    private static func drawTableHeader(at y: inout CGFloat, contentWidth: CGFloat, margin: CGFloat) {
        let headerRect = CGRect(x: margin, y: y, width: contentWidth, height: 24)
        brandBlue.setFill()
        UIBezierPath(roundedRect: headerRect, cornerRadius: 4).fill()

        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .bold),
            .foregroundColor: UIColor.white
        ]
        "Description".draw(at: CGPoint(x: margin + 8, y: y + 6), withAttributes: attrs)
        "Type".draw(at: CGPoint(x: margin + 260, y: y + 6), withAttributes: attrs)
        "Qty".draw(at: CGPoint(x: margin + 330, y: y + 6), withAttributes: attrs)
        "Rate".draw(at: CGPoint(x: margin + 390, y: y + 6), withAttributes: attrs)
        "Amount".draw(at: CGPoint(x: margin + 460, y: y + 6), withAttributes: attrs)

        y += 30
    }

    private static func drawLineItem(_ item: EstimateItem, at y: inout CGFloat, contentWidth: CGFloat, margin: CGFloat, isAlternate: Bool) {
        if isAlternate {
            let bgRect = CGRect(x: margin, y: y - 2, width: contentWidth, height: 18)
            UIColor(white: 0.96, alpha: 1).setFill()
            UIBezierPath(rect: bgRect).fill()
        }

        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9),
            .foregroundColor: UIColor.darkGray
        ]
        let typeAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8),
            .foregroundColor: UIColor.gray
        ]

        // Truncate long descriptions
        let maxDescWidth: CGFloat = 210
        let desc = item.description
        let descRect = CGRect(x: margin + 8, y: y, width: maxDescWidth, height: 14)
        desc.draw(in: descRect, withAttributes: attrs)

        item.type.rawValue.capitalized.draw(at: CGPoint(x: margin + 260, y: y), withAttributes: typeAttrs)

        let qtyStr = item.quantity.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f %@", item.quantity, item.unit)
            : String(format: "%.1f %@", item.quantity, item.unit)
        qtyStr.draw(at: CGPoint(x: margin + 330, y: y), withAttributes: attrs)

        String(format: "$%.2f", item.unitPrice).draw(at: CGPoint(x: margin + 390, y: y), withAttributes: attrs)
        String(format: "$%.2f", item.totalPrice).draw(at: CGPoint(x: margin + 460, y: y), withAttributes: attrs)

        y += 18
    }

    private static func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        return display.string(from: date)
    }
}
