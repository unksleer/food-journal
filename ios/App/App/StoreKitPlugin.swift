import Foundation
import Capacitor
import StoreKit

/// StoreKit 2 bridge for the one-time "Fuel Tracker Pro (Lifetime)" unlock (`com.leeunks.ketojournal.pro`).
/// Also checks AppTransaction.shared so users who purchased the app when it was paid upfront (< 1.2.0)
/// are automatically grandfathered into Lifetime Pro.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    private let proProductId = "com.leeunks.ketojournal.pro"

    private func checkEntitled() async -> (unlocked: Bool, grandfathered: Bool, displayPrice: String) {
        var unlocked = false
        var grandfathered = false
        var displayPrice = "$4.99"

        if #available(iOS 15.0, *) {
            for await result in Transaction.currentEntitlements {
                if case .verified(let tx) = result, tx.productID == proProductId, tx.revocationDate == nil {
                    unlocked = true
                    break
                }
            }
            if !unlocked, #available(iOS 16.0, *) {
                if let appTxResult = try? await AppTransaction.shared,
                   case .verified(let appTx) = appTxResult {
                    let orig = appTx.originalAppVersion
                    if orig.compare("1.2", options: .numeric) == .orderedAscending {
                        unlocked = true
                        grandfathered = true
                    }
                }
            }
            if let products = try? await Product.products(for: [proProductId]),
               let product = products.first {
                displayPrice = product.displayPrice
            }
        }
        return (unlocked, grandfathered, displayPrice)
    }

    @objc func status(_ call: CAPPluginCall) {
        Task {
            let res = await checkEntitled()
            call.resolve([
                "unlocked": res.unlocked,
                "grandfathered": res.grandfathered,
                "displayPrice": res.displayPrice
            ])
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task {
            if #available(iOS 15.0, *) {
                do {
                    let products = try await Product.products(for: [proProductId])
                    guard let product = products.first else {
                        call.reject("Fuel Tracker Pro is not available in the App Store yet.")
                        return
                    }
                    let result = try await product.purchase()
                    switch result {
                    case .success(let verification):
                        if case .verified(let tx) = verification {
                            await tx.finish()
                            call.resolve(["unlocked": true, "cancelled": false])
                        } else {
                            call.reject("Purchase verification failed.")
                        }
                    case .userCancelled:
                        call.resolve(["unlocked": false, "cancelled": true])
                    case .pending:
                        call.resolve(["unlocked": false, "pending": true])
                    @unknown default:
                        call.resolve(["unlocked": false])
                    }
                } catch {
                    call.reject(error.localizedDescription)
                }
            } else {
                call.reject("Requires iOS 15 or newer.")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            if #available(iOS 15.0, *) {
                try? await AppStore.sync()
                let res = await checkEntitled()
                call.resolve([
                    "unlocked": res.unlocked,
                    "grandfathered": res.grandfathered
                ])
            } else {
                call.reject("Requires iOS 15 or newer.")
            }
        }
    }
}
