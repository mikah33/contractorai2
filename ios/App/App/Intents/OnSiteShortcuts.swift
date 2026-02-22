import AppIntents

@available(iOS 16.0, *)
struct OnSiteShortcuts: AppShortcutsProvider {

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskOnSiteIntent(),
            phrases: [
                "Ask \(.applicationName) something",
                "Hey \(.applicationName)",
                "Talk to \(.applicationName)"
            ],
            shortTitle: "Ask OnSite",
            systemImageName: "message.fill"
        )

        AppShortcut(
            intent: CreateTaskIntent(),
            phrases: [
                "Create a task in \(.applicationName)",
                "Add a task in \(.applicationName)",
                "New task in \(.applicationName)"
            ],
            shortTitle: "Create Task",
            systemImageName: "checkmark.circle"
        )

        AppShortcut(
            intent: LogMileageIntent(),
            phrases: [
                "Log mileage in \(.applicationName)",
                "Record mileage in \(.applicationName)",
                "Add mileage in \(.applicationName)"
            ],
            shortTitle: "Log Mileage",
            systemImageName: "car.fill"
        )

        AppShortcut(
            intent: LogTimeIntent(),
            phrases: [
                "Log time in \(.applicationName)",
                "Record hours in \(.applicationName)",
                "Track time in \(.applicationName)"
            ],
            shortTitle: "Log Time",
            systemImageName: "clock.fill"
        )

        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: [
                "Add expense in \(.applicationName)",
                "Log expense in \(.applicationName)",
                "Record expense in \(.applicationName)"
            ],
            shortTitle: "Add Expense",
            systemImageName: "dollarsign.circle.fill"
        )

        AppShortcut(
            intent: CreateClientIntent(),
            phrases: [
                "Add a client in \(.applicationName)",
                "New client in \(.applicationName)",
                "Create client in \(.applicationName)"
            ],
            shortTitle: "Add Client",
            systemImageName: "person.fill.badge.plus"
        )

        AppShortcut(
            intent: GetProjectsIntent(),
            phrases: [
                "Get projects from \(.applicationName)",
                "Show my projects in \(.applicationName)",
                "How many projects in \(.applicationName)"
            ],
            shortTitle: "Get Projects",
            systemImageName: "folder.fill"
        )

        AppShortcut(
            intent: StartMileageTrackingIntent(),
            phrases: [
                "Start tracking mileage in \(.applicationName)",
                "Start mileage in \(.applicationName)"
            ],
            shortTitle: "Start Tracking",
            systemImageName: "location.fill"
        )

        AppShortcut(
            intent: StopMileageTrackingIntent(),
            phrases: [
                "Stop tracking mileage in \(.applicationName)",
                "Stop mileage in \(.applicationName)"
            ],
            shortTitle: "Stop Tracking",
            systemImageName: "location.slash.fill"
        )
    }
}
