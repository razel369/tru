import Foundation
import React
import WatchConnectivity

@objc(PawPairWatchBridge)
final class PawPairWatchBridge: RCTEventEmitter, WCSessionDelegate {
  private var observing = false
  private var pendingContext: [String: Any]?
  private var pendingActions: [[String: String]] = []
  private let pendingActionsKey = "pawpair.watch.pending-actions.v1"

  override init() {
    super.init()
    pendingActions =
      UserDefaults.standard.array(forKey: pendingActionsKey) as? [[String: String]] ?? []
    if WCSession.isSupported() {
      let session = WCSession.default
      session.delegate = self
      session.activate()
    }
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["PawPairWatchAction", "PawPairWatchStatus"]
  }

  override func startObserving() {
    observing = true
    flushPendingActions()
  }

  override func stopObserving() {
    observing = false
  }

  @objc(sync:resolver:rejecter:)
  func sync(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard WCSession.isSupported() else {
      resolve(false)
      return
    }

    let context = payload as? [String: Any] ?? [:]
    DispatchQueue.main.async { [weak self] in
      let session = WCSession.default
      guard session.activationState == .activated else {
        self?.pendingContext = context
        resolve(true)
        return
      }

      do {
        try session.updateApplicationContext(context)
        resolve(true)
      } catch {
        reject("watch_sync_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(getStatus:rejecter:)
  func getStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      resolve(self.connectionStatus())
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async { [weak self] in
      self?.emitConnectionStatus()
      guard activationState == .activated else { return }
      guard let self, let context = self.pendingContext else { return }
      try? session.updateApplicationContext(context)
      self.pendingContext = nil
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { [weak self] in
      self?.emitConnectionStatus()
    }
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    DispatchQueue.main.async { [weak self] in
      self?.emitConnectionStatus()
    }
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any]
  ) {
    queueOrEmitAction(message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    let accepted = queueOrEmitAction(message)
    replyHandler(["accepted": accepted])
  }

  func session(
    _ session: WCSession,
    didReceiveUserInfo userInfo: [String: Any] = [:]
  ) {
    queueOrEmitAction(userInfo)
  }

  @discardableResult
  private func queueOrEmitAction(_ payload: [String: Any]) -> Bool {
    guard
      payload["type"] as? String == "careAction",
      let occurrenceId = payload["occurrenceId"] as? String,
      let status = payload["status"] as? String,
      status == "done" || status == "skipped"
    else {
      return false
    }

    let action = ["occurrenceId": occurrenceId, "status": status]
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      if self.observing {
        self.sendEvent(withName: "PawPairWatchAction", body: action)
        return
      }

      self.pendingActions.append(action)
      if self.pendingActions.count > 50 {
        self.pendingActions.removeFirst(self.pendingActions.count - 50)
      }
      self.persistPendingActions()
    }
    return true
  }

  private func flushPendingActions() {
    guard observing, !pendingActions.isEmpty else { return }
    let actions = pendingActions
    pendingActions.removeAll()
    persistPendingActions()
    actions.forEach {
      sendEvent(withName: "PawPairWatchAction", body: $0)
    }
  }

  private func persistPendingActions() {
    UserDefaults.standard.set(pendingActions, forKey: pendingActionsKey)
  }

  private func connectionStatus() -> [String: Any] {
    guard WCSession.isSupported() else {
      return [
        "supported": false,
        "paired": false,
        "watchAppInstalled": false,
        "reachable": false,
        "activationState": "notActivated",
      ]
    }
    let session = WCSession.default
    let activationState: String
    switch session.activationState {
    case .activated:
      activationState = "activated"
    case .inactive:
      activationState = "inactive"
    default:
      activationState = "notActivated"
    }
    return [
      "supported": true,
      "paired": session.isPaired,
      "watchAppInstalled": session.isWatchAppInstalled,
      "reachable": session.isReachable,
      "activationState": activationState,
    ]
  }

  private func emitConnectionStatus() {
    guard observing else { return }
    sendEvent(withName: "PawPairWatchStatus", body: connectionStatus())
  }
}
