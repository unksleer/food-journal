import Foundation
import Capacitor
import WidgetKit

/// Writes today's numbers into the shared App Group so the FuelWidget extension can read them,
/// then asks WidgetKit to redraw. Requires the App Groups capability on both targets.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise)
    ]

    private func defaults(_ call: CAPPluginCall) -> UserDefaults? {
        guard let group = call.getString("group"), let d = UserDefaults(suiteName: group) else {
            call.reject("App Group is not available. Add the App Groups capability in Xcode.")
            return nil
        }
        return d
    }

    @objc func setItem(_ call: CAPPluginCall) {
        guard let d = defaults(call) else { return }
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        d.set(value, forKey: key)
        call.resolve()
    }

    @objc func removeItem(_ call: CAPPluginCall) {
        guard let d = defaults(call) else { return }
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        d.removeObject(forKey: key)
        call.resolve()
    }

    @objc func reload(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            if let kind = call.getString("kind") {
                WidgetCenter.shared.reloadTimelines(ofKind: kind)
            } else {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
        call.resolve()
    }
}
