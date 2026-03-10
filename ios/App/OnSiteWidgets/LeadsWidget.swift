import WidgetKit
import SwiftUI

// MARK: - Backwards-compatible background extension
extension View {
    func widgetBackground(_ backgroundView: some View) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            return AnyView(self.containerBackground(for: .widget) { backgroundView })
        } else {
            return AnyView(self.background(backgroundView))
        }
    }
}

// MARK: - Data
struct LeadsEntry: TimelineEntry {
    let date: Date
    let leadCount: Int
    let leads: [WidgetDataManager.RecentLead]
}

struct LeadsTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> LeadsEntry {
        LeadsEntry(date: Date(), leadCount: 4, leads: [
            WidgetDataManager.RecentLead(id: "1", name: "John Smith", source: "facebook", calculatorType: nil, estimatedValue: nil, createdAt: "", outreachCount: 2, totalOutreach: 5, actionLabel: "2/5"),
            WidgetDataManager.RecentLead(id: "2", name: "Jane Doe", source: "website", calculatorType: nil, estimatedValue: nil, createdAt: "", outreachCount: 0, totalOutreach: 5, actionLabel: "New"),
            WidgetDataManager.RecentLead(id: "3", name: "Mike Johnson", source: "referral", calculatorType: nil, estimatedValue: nil, createdAt: "", outreachCount: 3, totalOutreach: 5, actionLabel: "3/5"),
            WidgetDataManager.RecentLead(id: "4", name: "Sarah Wilson", source: "google", calculatorType: nil, estimatedValue: nil, createdAt: "", outreachCount: 1, totalOutreach: 5, actionLabel: "1/5"),
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (LeadsEntry) -> Void) {
        let count = WidgetDataManager.getNewLeadsCount()
        let leads = WidgetDataManager.getRecentLeads()
        completion(LeadsEntry(date: Date(), leadCount: count, leads: leads))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LeadsEntry>) -> Void) {
        let count = WidgetDataManager.getNewLeadsCount()
        let leads = WidgetDataManager.getRecentLeads()
        let entry = LeadsEntry(date: Date(), leadCount: count, leads: leads)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Lock Screen View (accessoryRectangular)
struct LeadsRectangularView: View {
    let entry: LeadsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if entry.leads.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 11))
                    Text("No leads to follow up")
                        .font(.system(size: 12))
                }
            } else {
                HStack(spacing: 3) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 9))
                    Text("\(entry.leadCount) lead\(entry.leadCount == 1 ? "" : "s")")
                        .font(.system(size: 11, weight: .semibold))
                }
                ForEach(entry.leads.prefix(2), id: \.id) { lead in
                    HStack(spacing: 0) {
                        Text(lead.name)
                            .font(.system(size: 11))
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        Text(lead.actionLabel ?? "New")
                            .font(.system(size: 11, weight: .medium))
                    }
                }
            }
        }
    }
}

// MARK: - Home Screen Medium (shows ~4 clients)
struct LeadsMediumView: View {
    let entry: LeadsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "phone.arrow.up.right.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.blue)
                Text("Clients to Contact")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text("\(entry.leadCount)")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.blue)
            }

            if entry.leads.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(.green)
                        Text("All caught up!")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(entry.leads.prefix(4), id: \.id) { lead in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(outreachColor(lead))
                            .frame(width: 8, height: 8)
                        Text(lead.name)
                            .font(.system(size: 14, weight: .medium))
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        Text(lead.actionLabel ?? "New")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(outreachColor(lead))
                    }
                }
                if entry.leadCount > 4 {
                    Text("+\(entry.leadCount - 4) more")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(14)
    }

    func outreachColor(_ lead: WidgetDataManager.RecentLead) -> Color {
        let count = lead.outreachCount ?? 0
        if count == 0 { return .blue }
        if count < 3 { return .orange }
        return .red
    }
}

// MARK: - Home Screen Large (shows ~8 clients)
struct LeadsLargeView: View {
    let entry: LeadsEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "phone.arrow.up.right.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.blue)
                Text("Clients to Contact")
                    .font(.system(size: 17, weight: .bold))
                Spacer()
                Text("\(entry.leadCount)")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.blue)
            }

            Divider()

            if entry.leads.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(.green)
                        Text("All caught up!")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                        Text("No clients need follow-up")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(entry.leads.prefix(8), id: \.id) { lead in
                    HStack(spacing: 10) {
                        Circle()
                            .fill(outreachColor(lead))
                            .frame(width: 10, height: 10)
                        Text(lead.name)
                            .font(.system(size: 15, weight: .medium))
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        Text(lead.actionLabel ?? "New")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(outreachColor(lead))
                    }
                    .padding(.vertical, 3)
                }
                if entry.leadCount > 8 {
                    HStack {
                        Spacer()
                        Text("+\(entry.leadCount - 8) more clients")
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
    }

    func outreachColor(_ lead: WidgetDataManager.RecentLead) -> Color {
        let count = lead.outreachCount ?? 0
        if count == 0 { return .blue }
        if count < 3 { return .orange }
        return .red
    }
}

// MARK: - Entry View (routes to correct view per family)
struct LeadsWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: LeadsEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            // Lock screen: NO containerBackground, no custom colors
            LeadsRectangularView(entry: entry)
        case .systemLarge:
            LeadsLargeView(entry: entry)
                .widgetBackground(Color(.systemBackground))
        case .systemMedium:
            LeadsMediumView(entry: entry)
                .widgetBackground(Color(.systemBackground))
        default:
            LeadsRectangularView(entry: entry)
        }
    }
}

// MARK: - Widget
struct LeadsWidget: Widget {
    let kind = "LeadsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LeadsTimelineProvider()) { entry in
            LeadsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Lead Follow-Ups")
        .description("Clients that need to be contacted")
        .supportedFamilies([
            .accessoryRectangular,
            .systemMedium,
            .systemLarge,
        ])
    }
}
