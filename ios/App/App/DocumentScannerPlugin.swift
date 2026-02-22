import Foundation
import Capacitor
import VisionKit
import Vision
import UIKit

@objc(DocumentScannerPlugin)
public class DocumentScannerPlugin: CAPPlugin, CAPBridgedPlugin, VNDocumentCameraViewControllerDelegate {

    public let identifier = "DocumentScannerPlugin"
    public let jsName = "DocumentScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanDocument", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    private var pendingCall: CAPPluginCall?

    // MARK: - Plugin Methods

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": VNDocumentCameraViewController.isSupported])
    }

    @objc func scanDocument(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("Document scanning is not supported on this device")
            return
        }

        pendingCall = call

        DispatchQueue.main.async { [weak self] in
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            self?.bridge?.viewController?.present(scanner, animated: true)
        }
    }

    // MARK: - VNDocumentCameraViewControllerDelegate

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
        controller.dismiss(animated: true)

        guard let call = pendingCall else { return }
        pendingCall = nil

        // Process all scanned pages
        var pages: [[String: Any]] = []

        let group = DispatchGroup()

        for i in 0..<scan.pageCount {
            group.enter()
            let image = scan.imageOfPage(at: i)

            // Save image to temp file
            let fileName = "receipt_scan_\(Date().timeIntervalSince1970)_\(i).jpg"
            let tempDir = FileManager.default.temporaryDirectory
            let fileURL = tempDir.appendingPathComponent(fileName)

            if let jpegData = image.jpegData(compressionQuality: 0.85) {
                try? jpegData.write(to: fileURL)
            }

            // Run OCR on the image
            performOCR(on: image) { extractedText, receiptData in
                var pageData: [String: Any] = [
                    "pageIndex": i,
                    "imagePath": fileURL.absoluteString,
                    "rawText": extractedText
                ]

                // Add parsed receipt fields
                if let data = receiptData {
                    pageData["vendor"] = data["vendor"] ?? ""
                    pageData["amount"] = data["amount"] ?? 0
                    pageData["date"] = data["date"] ?? ""
                    pageData["taxAmount"] = data["taxAmount"] ?? 0
                    pageData["subtotal"] = data["subtotal"] ?? 0
                    pageData["receiptNumber"] = data["receiptNumber"] ?? ""
                }

                pages.append(pageData)
                group.leave()
            }
        }

        group.notify(queue: .main) {
            // Sort pages by index
            let sortedPages = pages.sorted { ($0["pageIndex"] as? Int ?? 0) < ($1["pageIndex"] as? Int ?? 0) }

            // Use first page data as primary
            let primary = sortedPages.first ?? [:]

            call.resolve([
                "pages": sortedPages,
                "pageCount": scan.pageCount,
                "vendor": primary["vendor"] ?? "",
                "amount": primary["amount"] ?? 0,
                "date": primary["date"] ?? "",
                "taxAmount": primary["taxAmount"] ?? 0,
                "subtotal": primary["subtotal"] ?? 0,
                "receiptNumber": primary["receiptNumber"] ?? "",
                "rawText": primary["rawText"] ?? "",
                "imagePath": primary["imagePath"] ?? ""
            ])
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        controller.dismiss(animated: true)
        pendingCall?.reject("Scan cancelled")
        pendingCall = nil
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
        controller.dismiss(animated: true)
        pendingCall?.reject("Scan failed: \(error.localizedDescription)")
        pendingCall = nil
    }

    // MARK: - On-Device OCR

    private func performOCR(on image: UIImage, completion: @escaping (String, [String: Any]?) -> Void) {
        guard let cgImage = image.cgImage else {
            completion("", nil)
            return
        }

        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion("", nil)
                return
            }

            // Extract all recognized text lines
            let lines = observations.compactMap { observation -> String? in
                observation.topCandidates(1).first?.string
            }

            let fullText = lines.joined(separator: "\n")
            print("[DocumentScanner] OCR lines: \(lines)")

            // Parse receipt data from text
            let receiptData = self.parseReceiptText(lines: lines, fullText: fullText)
            print("[DocumentScanner] Parsed data: \(receiptData ?? [:])")

            completion(fullText, receiptData)
        }

        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }

    // MARK: - Receipt Parsing

    private func parseReceiptText(lines: [String], fullText: String) -> [String: Any] {
        var result: [String: Any] = [:]

        // --- Vendor Name ---
        // Usually the first 1-3 non-empty lines that aren't a date, number, address, or phone
        for line in lines.prefix(6) {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { continue }
            if trimmed.count < 2 { continue }
            // Skip lines that look like dates
            if trimmed.range(of: #"^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}"#, options: .regularExpression) != nil { continue }
            // Skip lines that are addresses (start with number + street)
            if trimmed.range(of: #"^\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|ct|way|pkwy|hwy)"#, options: [.regularExpression, .caseInsensitive]) != nil { continue }
            // Skip phone numbers
            if trimmed.range(of: #"^\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}"#, options: .regularExpression) != nil { continue }
            // Skip lines that are purely numbers/symbols
            if trimmed.range(of: #"^[\d\s\$\.\,\-\+\#\*]+$"#, options: .regularExpression) != nil { continue }
            // Skip "welcome" / "thank you" lines
            if trimmed.range(of: #"(?i)^(welcome|thank|have a|customer copy|merchant copy)"#, options: .regularExpression) != nil { continue }
            result["vendor"] = trimmed
            break
        }

        // --- Helper: extract dollar amount from a string ---
        func extractAmount(_ text: String) -> Double? {
            let nsText = text as NSString
            let len = nsText.length

            // Try multiple patterns in priority order, return first match
            let patterns: [String] = [
                // $12.71 or $ 12.71 or $1,234.56
                #"\$\s*(\d[\d,]*\.\d{2})"#,
                // 12.71 or 1,234.56 (any number with exactly 2 decimal places)
                #"(\d[\d,]*\.\d{2})\s*$"#,
                // 12.71 anywhere on the line
                #"(\d[\d,]*\.\d{2})"#,
                // $12 or $ 12 (dollar sign, whole number)
                #"\$\s*(\d[\d,]*)"#,
            ]

            for pattern in patterns {
                guard let regex = try? NSRegularExpression(pattern: pattern) else { continue }
                let matches = regex.matches(in: text, range: NSRange(location: 0, length: len))
                if let lastMatch = matches.last, lastMatch.numberOfRanges > 1 {
                    let numStr = nsText.substring(with: lastMatch.range(at: 1)).replacingOccurrences(of: ",", with: "")
                    if let val = Double(numStr), val > 0 { return val }
                }
            }

            return nil
        }

        // --- Total Amount ---
        // Strategy: scan lines for keywords, then extract the amount from that line
        // Also check the NEXT line in case amount is on a separate line
        let totalKeywords: [(pattern: String, priority: Int)] = [
            (#"(?i)\bgrand\s*total\b"#, 10),
            (#"(?i)\btotal\s*due\b"#, 9),
            (#"(?i)\bamount\s*due\b"#, 9),
            (#"(?i)\bbalance\s*due\b"#, 9),
            (#"(?i)\btotal\s*charged?\b"#, 8),
            (#"(?i)\btotal\s*sale\b"#, 8),
            (#"(?i)\btotal\b"#, 5),
            (#"(?i)\bamt\b"#, 3),
        ]

        // Skip these total-like words (they're subtotals, not the final total)
        let skipKeywords = [
            #"(?i)\bsub\s*-?\s*total\b"#,
            #"(?i)\bitem\s*total\b"#,
            #"(?i)\btotal\s*(?:items?|qty|savings?|discount|earned|points|rewards)\b"#,
        ]

        var bestTotal: (amount: Double, priority: Int)? = nil

        for (i, line) in lines.enumerated() {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)

            // Check if this line should be skipped
            var shouldSkip = false
            for skipPat in skipKeywords {
                if trimmed.range(of: skipPat, options: .regularExpression) != nil {
                    shouldSkip = true
                    break
                }
            }
            if shouldSkip { continue }

            for (pattern, priority) in totalKeywords {
                if trimmed.range(of: pattern, options: .regularExpression) != nil {
                    // Try to extract amount from this line
                    if let amount = extractAmount(trimmed), amount > 0 {
                        if bestTotal == nil || priority > bestTotal!.priority || (priority == bestTotal!.priority && amount > bestTotal!.amount) {
                            bestTotal = (amount, priority)
                        }
                    }
                    // Also check next line (amount might be on its own line)
                    else if i + 1 < lines.count {
                        let nextLine = lines[i + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                        if let amount = extractAmount(nextLine), amount > 0 {
                            if bestTotal == nil || priority > bestTotal!.priority {
                                bestTotal = (amount, priority)
                            }
                        }
                    }
                    break // Only match first keyword per line
                }
            }
        }

        if let total = bestTotal {
            result["amount"] = total.amount
        } else {
            // Fallback: collect ALL dollar amounts with decimals, pick the largest
            var allAmounts: [Double] = []
            for line in lines {
                let nsLine = line as NSString
                if let regex = try? NSRegularExpression(pattern: #"\$\s*(\d{1,3}(?:,\d{3})*\.\d{1,2})"#) {
                    let matches = regex.matches(in: line, range: NSRange(location: 0, length: nsLine.length))
                    for match in matches {
                        if match.numberOfRanges > 1 {
                            let numStr = nsLine.substring(with: match.range(at: 1)).replacingOccurrences(of: ",", with: "")
                            if let amt = Double(numStr), amt > 0 {
                                allAmounts.append(amt)
                            }
                        }
                    }
                }
            }
            if let largest = allAmounts.max() {
                result["amount"] = largest
            }
        }

        // --- Tax Amount ---
        let taxKeywords = [
            #"(?i)\bsales\s*tax\b"#,
            #"(?i)\btax\b"#,
            #"(?i)\bhst\b"#,
            #"(?i)\bgst\b"#,
            #"(?i)\bvat\b"#,
        ]

        for (i, line) in lines.enumerated() {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            // Skip lines with "total" to avoid confusing tax total with tax amount
            if trimmed.range(of: #"(?i)\btax\s*total\b"#, options: .regularExpression) != nil { continue }
            // Skip lines about tax exempt
            if trimmed.range(of: #"(?i)\btax\s*(exempt|free|id)\b"#, options: .regularExpression) != nil { continue }

            for keyword in taxKeywords {
                if trimmed.range(of: keyword, options: .regularExpression) != nil {
                    if let amount = extractAmount(trimmed), amount > 0 {
                        result["taxAmount"] = amount
                    } else if i + 1 < lines.count {
                        let nextLine = lines[i + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                        if let amount = extractAmount(nextLine), amount > 0 {
                            result["taxAmount"] = amount
                        }
                    }
                    break
                }
            }
            if result["taxAmount"] != nil { break }
        }

        // --- Subtotal ---
        let subtotalKeywords = [
            #"(?i)\bsub\s*-?\s*total\b"#,
            #"(?i)\bitem\s*total\b"#,
        ]

        for (i, line) in lines.enumerated() {
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            for keyword in subtotalKeywords {
                if trimmed.range(of: keyword, options: .regularExpression) != nil {
                    if let amount = extractAmount(trimmed), amount > 0 {
                        result["subtotal"] = amount
                    } else if i + 1 < lines.count {
                        let nextLine = lines[i + 1].trimmingCharacters(in: .whitespacesAndNewlines)
                        if let amount = extractAmount(nextLine), amount > 0 {
                            result["subtotal"] = amount
                        }
                    }
                    break
                }
            }
            if result["subtotal"] != nil { break }
        }

        // --- Date ---
        let datePatterns = [
            #"(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})"#,
            #"(\w{3,9}\s+\d{1,2},?\s+\d{4})"#,
            #"(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})"#
        ]

        for line in lines {
            for pattern in datePatterns {
                if let match = line.range(of: pattern, options: .regularExpression) {
                    let dateStr = String(line[match])
                    if let parsed = parseDate(dateStr) {
                        let formatter = DateFormatter()
                        formatter.dateFormat = "yyyy-MM-dd"
                        result["date"] = formatter.string(from: parsed)
                        break
                    }
                }
                if result["date"] != nil { break }
            }
            if result["date"] != nil { break }
        }

        // --- Receipt Number ---
        let receiptNumPatterns = [
            #"(?i)(?:receipt|invoice|order|trans(?:action)?|ticket|check)\s*#?\s*:?\s*([A-Z0-9\-]{3,20})"#,
            #"(?i)#\s*([A-Z0-9\-]{4,20})"#,
            #"(?i)(?:ref|confirmation)\s*#?\s*:?\s*([A-Z0-9\-]{3,20})"#
        ]

        for line in lines {
            for pattern in receiptNumPatterns {
                if let regex = try? NSRegularExpression(pattern: pattern) {
                    let nsLine = line as NSString
                    if let match = regex.firstMatch(in: line, range: NSRange(location: 0, length: nsLine.length)) {
                        if match.numberOfRanges > 1 {
                            result["receiptNumber"] = nsLine.substring(with: match.range(at: 1))
                            break
                        }
                    }
                }
                if result["receiptNumber"] != nil { break }
            }
            if result["receiptNumber"] != nil { break }
        }

        return result
    }

    private func parseDate(_ string: String) -> Date? {
        let formatters: [DateFormatter] = {
            let formats = [
                "MM/dd/yyyy", "M/d/yyyy", "MM-dd-yyyy", "M-d-yyyy",
                "MM/dd/yy", "M/d/yy",
                "yyyy-MM-dd", "yyyy/MM/dd",
                "MMMM d, yyyy", "MMM d, yyyy",
                "MMMM dd, yyyy", "MMM dd, yyyy"
            ]
            return formats.map { fmt in
                let f = DateFormatter()
                f.dateFormat = fmt
                f.locale = Locale(identifier: "en_US")
                return f
            }
        }()

        for formatter in formatters {
            if let date = formatter.date(from: string) {
                return date
            }
        }
        return nil
    }
}
