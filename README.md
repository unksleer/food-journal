# Fuel Tracker

A daily food journal for the Medi-Weightloss way of eating: lean protein by the ounce (VLP / LP / MP), counted net carbs, healthy fats, water, activity, and a morning check-in for ketones and weight. Ships to iOS through Capacitor; also runs as a web app and an Electron desktop app.

## Develop

```bash
npm install
npm run dev          # web dev server at http://localhost:5173
npm run lint
npm run build        # type-check + production build into dist/
```

## Test on iOS (Mac only)

```bash
npm run build
npx cap sync ios
npx cap open ios     # then run on a simulator or device from Xcode
```

## Capabilities (one-time Xcode setup)

The optional integrations under Settings need Apple entitlements, which Xcode registers with your developer account. Open `ios/App/App.xcodeproj`, select the **App** target, open **Signing & Capabilities**, press **+ Capability**, and add:

1. **iCloud** → tick **Key-value storage**. Powers "iCloud sync".
2. **HealthKit**. Powers "Apple Health".
3. **App Groups** → add `group.com.leeunks.ketojournal`. Powers the home-screen widget.

The widget lives in its own target, `FuelWidgetExtension` (`ios/App/FuelWidget/`), already wired into the project and embedded in the app. If Xcode complains about signing for it, select that target and repeat the App Groups step for it.

The barcode scanner needs no entitlement, only the camera usage string already in `Info.plist`.

## Layout

- `src/App.tsx` — state, routing between screens, month export to PDF
- `src/screens/` — Today, AddEntrySheet, Checkin, Trends, History, Settings
- `src/components/` — shared UI (cards, progress bars, swipe-to-delete rows, bottom sheet, tab bar)
- `src/lib/nutrition.ts` — tier tables, daily totals, day status, ketone zones
- `src/storage.ts` — localStorage persistence (one record per day, no cap), one-time migration from the v3.1 journal format, backup export/import
- `src/lib/cloudSync.ts` + `ios/App/App/CloudKVPlugin.swift` — iCloud key-value sync, newest edit wins
- `src/lib/health.ts` — Apple Health: writes check-in weight, reads steps and workouts
- `src/lib/barcode.ts` — camera scan plus Open Food Facts lookup for net carbs
- `src/lib/widget.ts` + `ios/App/App/WidgetBridgePlugin.swift` + `ios/App/FuelWidget/` — home-screen widget data and SwiftUI views

## Data

Everything is stored on the device. Settings → Your data exports a JSON backup through the share sheet and imports one back.
