import UIKit
import Capacitor

/// Registers plugins that live inside this app target (Capacitor only auto-registers npm plugins).
class FuelTrackerViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CloudKVPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
