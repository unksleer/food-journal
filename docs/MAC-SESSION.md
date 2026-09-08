# Mac session: finish the native integrations

You are running on Lee's Mac in `~/fuel-tracker`, branch `redesign/direction-a`. Xcode is installed. Everything below was written on a Linux box without Xcode, so the Swift code has never been compiled. Your job is to make it build, run, and work on a simulator, then on Lee's device if one is connected.

Keep a running log of what you do and find in `docs/MAC-SESSION-LOG.md` (create it): each step, the command, the outcome, and any error text you fixed. Commit as you go with clear messages. Push to `origin redesign/direction-a`.

## 0. Baseline

```bash
git status --short && git log --oneline -3
npm install && npm run build && npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' -configuration Debug build 2>&1 | tail -40
```

Fix any Swift compile errors in `ios/App/App/CloudKVPlugin.swift`, `WidgetBridgePlugin.swift`, `FuelTrackerViewController.swift`. Likely suspects: the `CAPBridgedPlugin` protocol shape for the installed Capacitor version (check `ios/App/CapApp-SPM` resolved Capacitor sources for `CAPBridgedPlugin`), `NSNull()` in `call.resolve`, and `capacitorDidLoad()` being `open`.

## 1. Capabilities

Check whether the App target already has the three capabilities Lee was asked to add (iCloud Key-value storage, HealthKit, App Groups `group.com.leeunks.ketojournal`). Inspect `ios/App/App/App.entitlements` and the signing state:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App -showBuildSettings 2>/dev/null | grep -E "CODE_SIGN_ENTITLEMENTS|DEVELOPMENT_TEAM|PRODUCT_BUNDLE_IDENTIFIER"
```

If the simulator build fails on provisioning for entitlements, the capabilities have not been registered with Apple yet. That step is Lee's (Xcode → App target → Signing & Capabilities → + Capability). Tell Lee exactly which one is missing and stop that item there; do not remove entitlements to get past it, except temporarily to verify the rest builds, and restore them.

## 2. Widget extension target

The `FuelWidgetExtension` target is already defined in project.pbxproj (hand-written). If Xcode refuses to open the project or the target is broken, fall back to:

a) Script it with Ruby `xcodeproj` gem if available (`gem list xcodeproj`), creating a `FuelWidget` Widget Extension target with `ios/App/FuelWidget/FuelWidget.swift` and an `Info.plist` carrying `NSExtension` → `NSExtensionPointIdentifier` = `com.apple.widgetkit-extension`, bundle id `com.leeunks.ketojournal.FuelWidget`, deployment target 15.5, App Group entitlement `group.com.leeunks.ketojournal`, and embed it in the App target (Embed Foundation Extensions build phase).

b) If that is not feasible, write out the exact Xcode clicks for Lee and stop.

Then build again and run on a simulator:

```bash
xcrun simctl list devices available | grep -i iphone | head
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,name=<an available iPhone>' build
```

## 3. Runtime checks on the simulator

Install and launch the app with `xcrun simctl`, then verify:

- Settings → Integrations → Barcode scanner on. Camera does not work in the simulator; just confirm the Scan button appears on the Carbs tab and that cancelling the scanner does not crash.
- Apple Health on: the Health permission sheet appears. Save a check-in with a weight; open the simulator's Health app and confirm the weight sample.
- iCloud sync: the simulator is usually not signed in to iCloud, so the switch should show the "not signed in" message and not crash. If the simulator is signed in, test it.
- Widget on: after logging food, add the Fuel Tracker widget to the simulator home screen and confirm numbers match Today. Log another food and confirm it refreshes.
- Screenshots of each into `docs/screens/` with `xcrun simctl io booted screenshot`.

## 4. Device

If `xcrun xctrace list devices` shows Lee's iPhone, build and run there too, and repeat the widget and barcode checks (the camera works on device). Ask Lee to scan a real product.

## 5. Report

Finish `docs/MAC-SESSION-LOG.md` with a short summary at the top: what works, what needs Lee, what is still broken. Commit and push.
