import Foundation
import Capacitor

/// Thin bridge over NSUbiquitousKeyValueStore so the journal can sync through iCloud
/// without a server. Requires the iCloud capability with "Key-value storage" ticked.
@objc(CloudKVPlugin)
public class CloudKVPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudKVPlugin"
    public let jsName = "CloudKV"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keys", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    private let store = NSUbiquitousKeyValueStore.default

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storeChanged(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
        store.synchronize()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func storeChanged(_ notification: Notification) {
        let keys = (notification.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String]) ?? []
        notifyListeners("changed", data: ["keys": keys])
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        if let value = store.string(forKey: key) {
            call.resolve(["value": value])
        } else {
            call.resolve(["value": NSNull()])
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("key and value are required")
            return
        }
        store.set(value, forKey: key)
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("key is required")
            return
        }
        store.removeObject(forKey: key)
        call.resolve()
    }

    @objc func keys(_ call: CAPPluginCall) {
        call.resolve(["keys": Array(store.dictionaryRepresentation.keys)])
    }

    @objc func sync(_ call: CAPPluginCall) {
        call.resolve(["ok": store.synchronize()])
    }
}
