import Foundation
import Capacitor
import WidgetKit

@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateLeadsWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateTimesheetWidget", returnType: CAPPluginReturnPromise),
    ]

    private let suiteName = "group.com.elevated.contractorai"

    @objc func updateLeadsWidget(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            call.reject("Cannot access App Group")
            return
        }

        let newCount = call.getInt("newCount") ?? 0
        let recentLeads = call.getArray("recentLeads", [String: Any].self) ?? []

        defaults.set(newCount, forKey: "leads_new_count")

        if let jsonData = try? JSONSerialization.data(withJSONObject: recentLeads) {
            defaults.set(jsonData, forKey: "leads_recent")
        }
        defaults.set(Date().timeIntervalSince1970, forKey: "leads_last_updated")

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "LeadsWidget")
        }

        call.resolve(["success": true])
    }

    @objc func updateTimesheetWidget(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            call.reject("Cannot access App Group")
            return
        }

        let entries = call.getArray("entries", [String: Any].self) ?? []

        if let jsonData = try? JSONSerialization.data(withJSONObject: entries) {
            defaults.set(jsonData, forKey: "timesheet_entries")
        }
        defaults.set(Date().timeIntervalSince1970, forKey: "timesheet_last_updated")

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "TimesheetWidget")
        }

        call.resolve(["success": true])
    }
}
