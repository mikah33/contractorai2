import UIKit
import Messages
import SwiftUI

class MessagesViewController: MSMessagesAppViewController {

    private var hostingController: UIHostingController<AnyView>?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        // Force all UITextField text to black (SwiftUI TextField wraps UITextField)
        UITextField.appearance().textColor = .black
        UITextView.appearance().textColor = .black
    }

    override func willBecomeActive(with conversation: MSConversation) {
        super.willBecomeActive(with: conversation)
        presentContent(for: conversation, with: presentationStyle)
    }

    override func willTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
        guard let conversation = activeConversation else { return }
        presentContent(for: conversation, with: presentationStyle)
    }

    override func didSelect(_ message: MSMessage, conversation: MSConversation) {
        guard let url = message.url,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let estimateId = components.queryItems?.first(where: { $0.name == "estimateId" })?.value else {
            return
        }

        let isFromMe = message.senderParticipantIdentifier == conversation.localParticipantIdentifier

        if isFromMe {
            // Sender tapped their own message — show preview
            presentEstimatePreview(estimateId: estimateId)
        } else {
            // Recipient tapped — show accept/decline
            presentEstimateResponse(estimateId: estimateId, message: message, conversation: conversation)
        }
    }

    // MARK: - Content Presentation

    private func presentContent(for conversation: MSConversation, with presentationStyle: MSMessagesAppPresentationStyle) {
        removeHostingController()

        // Check if opening from a selected message (recipient side)
        if let selectedMessage = conversation.selectedMessage,
           let url = selectedMessage.url,
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let estimateId = components.queryItems?.first(where: { $0.name == "estimateId" })?.value {

            let isFromMe = selectedMessage.senderParticipantIdentifier == conversation.localParticipantIdentifier
            if !isFromMe {
                presentEstimateResponse(estimateId: estimateId, message: selectedMessage, conversation: conversation)
                return
            } else {
                presentEstimatePreview(estimateId: estimateId)
                return
            }
        }

        // Default: show main estimate builder view
        let isCompact = presentationStyle == .compact
        let viewModel = EstimateViewModel()

        let mainView = MainView(
            viewModel: viewModel,
            isCompact: isCompact,
            onRequestExpand: { [weak self] in
                self?.requestPresentationStyle(.expanded)
            },
            onSendEstimate: { [weak self] estimate in
                self?.sendEstimateMessage(estimate: estimate, conversation: conversation)
            }
        )
        embedSwiftUIView(AnyView(mainView))
    }

    // MARK: - Estimate Preview (sender taps own message)

    private func presentEstimatePreview(estimateId: String) {
        requestPresentationStyle(.expanded)

        let viewModel = EstimateViewModel()
        let previewWrapper = EstimatePreviewWrapper(
            viewModel: viewModel,
            estimateId: estimateId,
            onDismiss: { [weak self] in
                guard let self = self, let conversation = self.activeConversation else { return }
                self.presentContent(for: conversation, with: self.presentationStyle)
            }
        )
        embedSwiftUIView(AnyView(previewWrapper))
    }

    // MARK: - Estimate Response (recipient taps message)

    private func presentEstimateResponse(estimateId: String, message: MSMessage, conversation: MSConversation) {
        requestPresentationStyle(.expanded)

        // Parse estimate data from URL so recipient doesn't need API
        let initialEstimate = parseEstimateFromURL(message.url)

        let responseView = EstimateResponseView(
            estimateId: estimateId,
            initialEstimate: initialEstimate,
            onAccept: { [weak self] in
                self?.sendResponseMessage(
                    action: "accepted",
                    estimateId: estimateId,
                    originalMessage: message,
                    conversation: conversation
                )
            },
            onDecline: { [weak self] in
                self?.sendResponseMessage(
                    action: "declined",
                    estimateId: estimateId,
                    originalMessage: message,
                    conversation: conversation
                )
            },
            onOpenURL: { [weak self] url in
                self?.extensionContext?.open(url)
            }
        )
        embedSwiftUIView(AnyView(responseView))
    }

    // MARK: - Parse Estimate from URL

    private func parseEstimateFromURL(_ url: URL?) -> Estimate? {
        guard let url = url,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else { return nil }

        func param(_ name: String) -> String? {
            queryItems.first(where: { $0.name == name })?.value
        }

        guard let estimateId = param("estimateId"),
              let title = param("title"),
              let totalStr = param("total"), let total = Double(totalStr) else { return nil }

        // Parse items from JSON
        var items: [EstimateItem] = []
        if let itemsJSON = param("items"),
           let data = itemsJSON.data(using: .utf8),
           let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            items = parsed.map { raw in
                EstimateItem(
                    description: raw["d"] as? String ?? "",
                    quantity: raw["q"] as? Double ?? 1,
                    unit: raw["u"] as? String ?? "ea",
                    unitPrice: raw["p"] as? Double ?? 0,
                    totalPrice: (raw["q"] as? Double ?? 1) * (raw["p"] as? Double ?? 0),
                    type: ItemType(rawValue: raw["t"] as? String ?? "material") ?? .material
                )
            }
        }

        return Estimate(
            id: estimateId,
            title: title,
            clientName: param("clientName"),
            status: .sent,
            items: items,
            subtotal: Double(param("subtotal") ?? "0") ?? 0,
            taxRate: Double(param("taxRate") ?? "0") ?? 0,
            taxAmount: Double(param("taxAmount") ?? "0") ?? 0,
            total: total,
            notes: param("notes"),
            terms: param("terms") ?? "Valid for 30 days"
        )
    }

    // MARK: - Send Estimate Message

    private func sendEstimateMessage(estimate: Estimate, conversation: MSConversation) {
        // Create email response record so edge function can find it
        Task {
            let apiService = EstimateAPIService()
            try? await apiService.createEstimateEmailResponse(estimate: estimate)
        }

        let session = MSSession()
        let message = MSMessage(session: session)

        // Encode full estimate data in web URL — recipients without the app see this in Safari
        var components = URLComponents(string: "https://contractorai.tools/view-estimate")!
        var queryItems = [
            URLQueryItem(name: "estimateId", value: estimate.id),
            URLQueryItem(name: "title", value: estimate.title),
            URLQueryItem(name: "total", value: String(format: "%.2f", estimate.total)),
            URLQueryItem(name: "subtotal", value: String(format: "%.2f", estimate.subtotal)),
            URLQueryItem(name: "taxRate", value: String(format: "%.2f", estimate.taxRate)),
            URLQueryItem(name: "taxAmount", value: String(format: "%.2f", estimate.taxAmount)),
            URLQueryItem(name: "clientName", value: estimate.clientName ?? ""),
            URLQueryItem(name: "status", value: "sent"),
            URLQueryItem(name: "terms", value: estimate.terms)
        ]
        if let notes = estimate.notes {
            queryItems.append(URLQueryItem(name: "notes", value: notes))
        }

        // Encode items as compact JSON
        let itemsData = estimate.items.map { item -> [String: Any] in
            ["d": item.description, "q": item.quantity, "u": item.unit, "p": item.unitPrice, "t": item.type.rawValue]
        }
        if let jsonData = try? JSONSerialization.data(withJSONObject: itemsData),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            queryItems.append(URLQueryItem(name: "items", value: jsonString))
        }

        components.queryItems = queryItems
        message.url = components.url

        // Rich bubble layout
        let layout = MSMessageTemplateLayout()
        layout.image = renderBubbleImage(for: estimate)
        layout.caption = estimate.title
        layout.subcaption = estimate.total.currencyFormatted
        layout.trailingCaption = "\(estimate.items.count) items"
        layout.trailingSubcaption = "Tap to view"
        message.layout = layout
        message.summaryText = "OnSite Estimate: \(estimate.title) — \(estimate.total.currencyFormatted)"

        conversation.insert(message) { error in
            if let error = error {
                print("[OnSiteMessages] Error inserting message: \(error)")
            }
        }
        dismiss()
    }

    // MARK: - Send Response Message

    private func sendResponseMessage(action: String, estimateId: String, originalMessage: MSMessage, conversation: MSConversation) {
        let message = MSMessage(session: originalMessage.session ?? MSSession())

        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "estimateId", value: estimateId),
            URLQueryItem(name: "status", value: action)
        ]
        message.url = components.url

        let layout = MSMessageTemplateLayout()
        layout.image = renderResponseBubbleImage(action: action)

        if action == "accepted" {
            layout.caption = "Estimate Accepted"
            layout.subcaption = "Ready to proceed!"
        } else {
            layout.caption = "Estimate Declined"
            layout.subcaption = "Declined by customer"
        }
        message.layout = layout
        message.summaryText = "Estimate \(action)"

        conversation.insert(message) { error in
            if let error = error {
                print("[OnSiteMessages] Error inserting response: \(error)")
            }
        }
        dismiss()
    }

    // MARK: - Bubble Image Rendering

    private func renderBubbleImage(for estimate: Estimate) -> UIImage? {
        let size = CGSize(width: 300, height: 180)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { ctx in
            // Light background
            UIColor.white.setFill()
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 12).fill()

            // Blue header bar
            UIColor(red: 4/255, green: 61/255, blue: 107/255, alpha: 1).setFill()
            let headerPath = UIBezierPath()
            headerPath.move(to: CGPoint(x: 0, y: 12))
            headerPath.addArc(withCenter: CGPoint(x: 12, y: 12), radius: 12, startAngle: .pi, endAngle: .pi * 1.5, clockwise: true)
            headerPath.addLine(to: CGPoint(x: size.width - 12, y: 0))
            headerPath.addArc(withCenter: CGPoint(x: size.width - 12, y: 12), radius: 12, startAngle: .pi * 1.5, endAngle: 0, clockwise: true)
            headerPath.addLine(to: CGPoint(x: size.width, y: 44))
            headerPath.addLine(to: CGPoint(x: 0, y: 44))
            headerPath.close()
            headerPath.fill()

            // OnSite logo text - offset right to clear iMessage app icon
            let brandAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 15, weight: .bold),
                .foregroundColor: UIColor.white
            ]
            "OnSite".draw(at: CGPoint(x: 50, y: 12), withAttributes: brandAttrs)

            // ESTIMATE badge
            let iconAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: .medium),
                .foregroundColor: UIColor.white.withAlphaComponent(0.85)
            ]
            "ESTIMATE".draw(at: CGPoint(x: size.width - 80, y: 16), withAttributes: iconAttrs)

            // Title
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14, weight: .semibold),
                .foregroundColor: UIColor(red: 26/255, green: 26/255, blue: 26/255, alpha: 1)
            ]
            let titleRect = CGRect(x: 16, y: 56, width: size.width - 32, height: 20)
            estimate.title.draw(in: titleRect, withAttributes: titleAttrs)

            // Total
            let totalAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 24, weight: .bold),
                .foregroundColor: UIColor(red: 4/255, green: 61/255, blue: 107/255, alpha: 1)
            ]
            estimate.total.currencyFormatted.draw(at: CGPoint(x: 16, y: 82), withAttributes: totalAttrs)

            // Item count
            let detailAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11),
                .foregroundColor: UIColor(red: 107/255, green: 114/255, blue: 128/255, alpha: 1)
            ]
            "\(estimate.items.count) line items".draw(at: CGPoint(x: 16, y: 114), withAttributes: detailAttrs)

            // CTA bar
            let ctaRect = CGRect(x: 16, y: 138, width: size.width - 32, height: 30)
            UIColor(red: 4/255, green: 61/255, blue: 107/255, alpha: 1).setFill()
            UIBezierPath(roundedRect: ctaRect, cornerRadius: 6).fill()

            let ctaAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .semibold),
                .foregroundColor: UIColor.white
            ]
            let ctaText = "Tap to view estimate"
            let ctaSize = ctaText.size(withAttributes: ctaAttrs)
            ctaText.draw(
                at: CGPoint(x: ctaRect.midX - ctaSize.width / 2, y: ctaRect.midY - ctaSize.height / 2),
                withAttributes: ctaAttrs
            )
        }
    }

    private func renderResponseBubbleImage(action: String) -> UIImage? {
        let size = CGSize(width: 300, height: 100)
        let renderer = UIGraphicsImageRenderer(size: size)

        let isAccepted = action == "accepted"

        return renderer.image { ctx in
            // Light background
            UIColor.white.setFill()
            UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 12).fill()

            // Status color bar
            let barColor = isAccepted
                ? UIColor(red: 22/255, green: 163/255, blue: 74/255, alpha: 1)
                : UIColor(red: 220/255, green: 38/255, blue: 38/255, alpha: 1)
            barColor.setFill()
            UIBezierPath(rect: CGRect(x: 0, y: 0, width: 4, height: size.height)).fill()

            // Icon
            let iconText = isAccepted ? "✓" : "✗"
            let iconAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 28, weight: .bold),
                .foregroundColor: barColor
            ]
            iconText.draw(at: CGPoint(x: 20, y: 28), withAttributes: iconAttrs)

            // Status text
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 16, weight: .bold),
                .foregroundColor: UIColor(red: 26/255, green: 26/255, blue: 26/255, alpha: 1)
            ]
            let title = isAccepted ? "Estimate Accepted" : "Estimate Declined"
            title.draw(at: CGPoint(x: 60, y: 30), withAttributes: titleAttrs)

            let subAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12),
                .foregroundColor: UIColor(red: 107/255, green: 114/255, blue: 128/255, alpha: 1)
            ]
            let sub = isAccepted ? "Ready to get started!" : "The customer has declined."
            sub.draw(at: CGPoint(x: 60, y: 54), withAttributes: subAttrs)
        }
    }

    // MARK: - SwiftUI Embedding

    private func embedSwiftUIView(_ view: AnyView) {
        removeHostingController()

        let controller = UIHostingController(rootView: view)
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        self.view.addSubview(controller.view)

        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: self.view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: self.view.bottomAnchor),
            controller.view.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: self.view.trailingAnchor)
        ])

        controller.didMove(toParent: self)
        hostingController = controller
    }

    private func removeHostingController() {
        hostingController?.willMove(toParent: nil)
        hostingController?.view.removeFromSuperview()
        hostingController?.removeFromParent()
        hostingController = nil
    }
}

// MARK: - Preview Wrapper (loads estimate then shows preview)

struct EstimatePreviewWrapper: View {
    @ObservedObject var viewModel: EstimateViewModel
    let estimateId: String
    var onDismiss: (() -> Void)? = nil

    var body: some View {
        Group {
            if viewModel.isLoading {
                ZStack {
                    OnSiteTheme.bgPrimary.ignoresSafeArea()
                    ProgressView()
                        .tint(OnSiteTheme.accent)
                }
            } else {
                EstimatePreviewView(estimate: viewModel.estimate, onDismiss: onDismiss)
            }
        }
        .task {
            await viewModel.loadEstimate(id: estimateId)
        }
    }
}
