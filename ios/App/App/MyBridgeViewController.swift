import UIKit
import Capacitor

class MyBridgeViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiDARScannerPlugin())
        bridge?.registerPluginInstance(AutoMileageTrackerPlugin())
        bridge?.registerPluginInstance(DocumentScannerPlugin())
        bridge?.registerPluginInstance(SiriIntentPlugin())
    }
}
