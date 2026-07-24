import Foundation
import React
import WatchConnectivity

@objc(PawPairWatchBridge)
final class PawPairWatchBridge: RCTEventEmitter, WCSessionDelegate {
  private var observing = false
  private var pendingContext: [String: Any]?

  override init() {
    super.init()
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
    ["PawPairWatchAction"]
  }

  override func startObserving() {
    observing = true
  }

  override func stopObserving() {
    observing = false
  }

  @objc(sync:resolver:rejecter:)
  func sync(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
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

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    guard activationState == .activated else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, let context = self.pendingContext else { return }
      try? session.updateApplicationContext(context)
      self.pendingContext = nil
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any]
  ) {
    emitAction(message)
  }

  func session(
    _ session: WCSession,
    didReceiveUserInfo userInfo: [String: Any] = [:]
  ) {
    emitAction(userInfo)
  }

  private func emitAction(_ payload: [String: Any]) {
    guard
      observing,
      payload["type"] as? String == "careAction",
      let occurrenceId = payload["occurrenceId"] as? String,
      let status = payload["status"] as? String
    else {
      return
    }

    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(
        withName: "PawPairWatchAction",
        body: ["occurrenceId": occurrenceId, "status": status]
      )
    }
  }
}
