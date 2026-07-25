import AppIntents
import Foundation

enum PawPairSystemRoute: String {
  case add
  case health
  case home

  static let notification = Notification.Name("PawPairSystemRoute")
  static let pendingKey = "pawpair.system.pending-route.v1"

  func prepareForApp() {
    UserDefaults.standard.set(rawValue, forKey: Self.pendingKey)
    DispatchQueue.main.async {
      NotificationCenter.default.post(
        name: Self.notification,
        object: nil,
        userInfo: ["route": self.rawValue]
      )
    }
  }
}

@available(iOS 16.0, *)
struct OpenPawPairTodayIntent: AppIntent {
  static let title: LocalizedStringResource = "Open PawPair Today"
  static let description = IntentDescription(
    "See the care moments waiting for your active pet."
  )
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    PawPairSystemRoute.home.prepareForApp()
    return .result()
  }
}

@available(iOS 16.0, *)
struct AddPawPairCareIntent: AppIntent {
  static let title: LocalizedStringResource = "Add a Care Moment"
  static let description = IntentDescription(
    "Open PawPair at the care moment composer."
  )
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    PawPairSystemRoute.add.prepareForApp()
    return .result()
  }
}

@available(iOS 16.0, *)
struct OpenPawPairHealthIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Pet Health"
  static let description = IntentDescription(
    "Open your active pet’s private health record in PawPair."
  )
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    PawPairSystemRoute.health.prepareForApp()
    return .result()
  }
}

@available(iOS 16.0, *)
struct PawPairAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenPawPairTodayIntent(),
      phrases: [
        "Open \(.applicationName)",
        "Show today in \(.applicationName)",
      ],
      shortTitle: "PawPair Today",
      systemImageName: "pawprint.fill"
    )
    AppShortcut(
      intent: AddPawPairCareIntent(),
      phrases: [
        "Add care in \(.applicationName)",
        "Add a care moment in \(.applicationName)",
      ],
      shortTitle: "Add Care",
      systemImageName: "plus.circle.fill"
    )
    AppShortcut(
      intent: OpenPawPairHealthIntent(),
      phrases: [
        "Open pet health in \(.applicationName)",
        "Show health in \(.applicationName)",
      ],
      shortTitle: "Pet Health",
      systemImageName: "cross.case.fill"
    )
  }

  static var shortcutTileColor: ShortcutTileColor = .orange
}
