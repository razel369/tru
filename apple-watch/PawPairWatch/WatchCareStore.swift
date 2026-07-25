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
  private let pendingIdsKey = "pawpair.watch.pending-ids.v1"

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
    persistPendingIds()
    applyLocalStatus(item.id, status: status)
    let payload: [String: Any] = [
      "type": "careAction",
      "occurrenceId": item.id,
      "status": status,
      "sentAt": ISO8601DateFormatter().string(from: Date()),
    ]
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(
        payload,
        replyHandler: { _ in },
        errorHandler: { _ in
          session.transferUserInfo(payload)
        }
      )
    } else {
      session.transferUserInfo(payload)
    }
  }

  private func applyLocalStatus(_ itemId: String, status: String) {
    let items = snapshot.items.map { item in
      guard item.id == itemId else { return item }
      return WatchCareItem(
        id: item.id,
        petId: item.petId,
        petName: item.petName,
        title: item.title,
        time: item.time,
        status: status,
        category: item.category,
        instructions: item.instructions
      )
    }
    snapshot = WatchCareSnapshot(
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      activePetId: snapshot.activePetId,
      items: items
    )
    persist(snapshot)
  }

  private func accept(_ context: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(context) else { return }
    do {
      let data = try JSONSerialization.data(withJSONObject: context)
      let decoded = try JSONDecoder().decode(WatchCareSnapshot.self, from: data)
      if !snapshot.generatedAt.isEmpty && decoded.generatedAt < snapshot.generatedAt {
        return
      }

      let currentItems = Dictionary(
        uniqueKeysWithValues: snapshot.items.map { ($0.id, $0) }
      )
      var stillPending = Set<String>()
      let mergedItems = decoded.items.map { item in
        guard
          pendingIds.contains(item.id),
          let current = currentItems[item.id],
          item.status != current.status
        else {
          return item
        }
        stillPending.insert(item.id)
        return WatchCareItem(
          id: item.id,
          petId: item.petId,
          petName: item.petName,
          title: item.title,
          time: item.time,
          status: current.status,
          category: item.category,
          instructions: item.instructions
        )
      }
      snapshot = WatchCareSnapshot(
        version: decoded.version,
        generatedAt: decoded.generatedAt,
        activePetId: decoded.activePetId,
        items: mergedItems
      )
      pendingIds = stillPending
      persist(snapshot)
      persistPendingIds()
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
    let storedPendingIds =
      UserDefaults.standard.stringArray(forKey: pendingIdsKey) ?? []
    pendingIds = Set(storedPendingIds).intersection(Set(decoded.items.map(\.id)))
  }

  private func persist(_ snapshot: WatchCareSnapshot) {
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    UserDefaults.standard.set(data, forKey: cacheKey)
  }

  private func persistPendingIds() {
    UserDefaults.standard.set(Array(pendingIds).sorted(), forKey: pendingIdsKey)
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
