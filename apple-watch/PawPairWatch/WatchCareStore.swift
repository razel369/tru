import Foundation
import WatchConnectivity

struct WatchCareItem: Codable, Identifiable, Hashable {
  let id: String
  let petId: String
  let petName: String
  let title: String
  let time: String
  let status: String
  let category: String
  let instructions: String
}

struct WatchCareSnapshot: Codable {
  let version: Int
  let generatedAt: String
  let activePetId: String?
  let items: [WatchCareItem]
}

@MainActor
final class WatchCareStore: NSObject, ObservableObject {
  @Published private(set) var snapshot = WatchCareSnapshot(
    version: 1,
    generatedAt: "",
    activePetId: nil,
    items: []
  )
  @Published private(set) var pendingIds = Set<String>()

  private let cacheKey = "pawpair.watch.snapshot.v1"

  override init() {
    super.init()
    restore()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func mark(_ item: WatchCareItem, status: String) {
    pendingIds.insert(item.id)
    let payload: [String: Any] = [
      "type": "careAction",
      "occurrenceId": item.id,
      "status": status,
      "sentAt": ISO8601DateFormatter().string(from: Date()),
    ]
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { [weak self] _ in
        Task { @MainActor in self?.pendingIds.remove(item.id) }
      }
    } else {
      session.transferUserInfo(payload)
    }
  }

  private func accept(_ context: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(context) else { return }
    do {
      let data = try JSONSerialization.data(withJSONObject: context)
      let decoded = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
      snapshot = decoded
      pendingIds = pendingIds.intersection(Set(decoded.items.map(\.id)))
      UserDefaults.standard.set(data, forKey: cacheKey)
    } catch {
      return
    }
  }

  private func restore() {
    guard
      let data = UserDefaults.standard.data(forKey: cacheKey),
      let decoded = try? JSONDecoder().decode(WatchCareSnapshot.self, from: data)
    else {
      return
    }
    snapshot = decoded
  }
}

extension WatchCareStore: WCSessionDelegate {
  nonisolated func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    let context = session.receivedApplicationContext
    Task { @MainActor [weak self] in self?.accept(context) }
  }

  nonisolated func session(
    _ session: WCSession,
    didReceiveApplicationContext applicationContext: [String: Any]
  ) {
    Task { @MainActor [weak self] in self?.accept(applicationContext) }
  }
}
