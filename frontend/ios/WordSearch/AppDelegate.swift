import Expo
import React
import ReactAppDependencyProvider
import GameKit

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    authenticateGameCenterLocalPlayer()

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - Game Center Support
extension AppDelegate {
  private func authenticateGameCenterLocalPlayer() {
    guard GKLocalPlayer.local.isAuthenticated == false else {
      configureGameCenterAccessPoint()
      NSLog("[GameCenter] Local player already authenticated as %@", GKLocalPlayer.local.displayName)
      return
    }

    GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
      if let error = error {
        NSLog("[GameCenter] Authentication handler error: %@", error.localizedDescription)
      }

      if let viewController = viewController {
        NSLog("[GameCenter] Presenting authentication view controller")
        self?.window?.rootViewController?.present(viewController, animated: true)
        return
      }

      if GKLocalPlayer.local.isAuthenticated {
        NSLog("[GameCenter] Authentication succeeded for %@", GKLocalPlayer.local.displayName)
        self?.configureGameCenterAccessPoint()
        self?.dismissAccessPointAfterDelay()
      } else {
        NSLog("[GameCenter] Player not authenticated and no UI was presented")
      }
    }
  }

  private func configureGameCenterAccessPoint() {
    if #available(iOS 14.0, *) {
      let accessPoint = GKAccessPoint.shared
      accessPoint.location = .topLeading
      accessPoint.showHighlights = true
      accessPoint.isActive = true
      NSLog("[GameCenter] Access point activated")
    }
  }

  private func dismissAccessPointAfterDelay() {
    guard #available(iOS 14.0, *) else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
      let accessPoint = GKAccessPoint.shared
      accessPoint.isActive = false
      NSLog("[GameCenter] Access point hidden after banner")
    }
  }
}
