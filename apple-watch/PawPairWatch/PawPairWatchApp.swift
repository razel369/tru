import SwiftUI

@main
struct PawPairWatchApp: App {
  @StateObject private var store = WatchCareStore()

  var body: some Scene {
    WindowGroup {
      CareHomeView()
        .environmentObject(store)
    }
  }
}
