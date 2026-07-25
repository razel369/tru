import Foundation
import React

@objc(PawPairSystemBridge)
final class PawPairSystemBridge: RCTEventEmitter {
  private var observing = false
  private var routeObserver: NSObjectProtocol?

  override init() {
    super.init()
    routeObserver = NotificationCenter.default.addObserver(
      forName: PawPairSystemRoute.notification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      guard
        let route = notification.userInfo?["route"] as? String
      else {
        return
      }
      self?.emit(route)
    }
  }

  deinit {
    if let routeObserver {
      NotificationCenter.default.removeObserver(routeObserver)
    }
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["PawPairSystemRoute"]
  }

  override func startObserving() {
    observing = true
  }

  override func stopObserving() {
    observing = false
  }

  @objc(consumePendingRoute:rejecter:)
  func consumePendingRoute(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let route = UserDefaults.standard.string(
        forKey: PawPairSystemRoute.pendingKey
      )
      UserDefaults.standard.removeObject(
        forKey: PawPairSystemRoute.pendingKey
      )
      resolve(route)
    }
  }

  private func emit(_ route: String) {
    guard observing else { return }
    sendEvent(
      withName: "PawPairSystemRoute",
      body: ["route": route]
    )
  }
}
