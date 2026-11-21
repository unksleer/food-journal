import UIKit
import Capacitor

/// Registers plugins that live inside this app target (Capacitor only auto-registers npm plugins).
@objc(FuelTrackerViewController)
class FuelTrackerViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CloudKVPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
