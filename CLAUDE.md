# Fuel Tracker — project notes for Claude

- iOS food journal for the Medi-Weightloss program (VLP/LP/MP protein by the ounce, counted net carbs). React + Vite + Capacitor 8. App Store id 6762644133, bundle `com.leeunks.ketojournal`.
- Active branch: `redesign/direction-a`. Lee tests on the Mac from `~/fuel-tracker`; a Linux clone at `/home/leeunks/food-journal` does the web-side work.
- The iOS project is Swift Package Manager only (`ios/App/CapApp-SPM`). Any Capacitor plugin without a `Package.swift` will not link; check before adding one.
- Capacitor CLI needs Node 22 (`nvm use 22` on the Linux box).
- Integrations and Monthly Clinic PDF export are gated behind `Fuel Tracker Pro` (`com.leeunks.ketojournal.pro`, $4.99 one-time unlock via `StoreKitPlugin.swift` + `src/lib/storekit.ts` + `src/screens/ProSheet.tsx`), while core VLP/LP/MP meal logging and morning check-ins remain free forever. Prior paid-upfront buyers (`originalAppVersion < 1.2`) and existing local journals are grandfathered into Pro automatically. See `docs/DECISIONS.md` for the full release, monetization, offer codes, and Apple Search Ads log.
- In-app Swift plugins (`CloudKVPlugin`, `WidgetBridgePlugin`, `StoreKitPlugin`) are registered in `FuelTrackerViewController.swift`, which `Main.storyboard` and `SceneDelegate` (`AppDelegate.swift`) point at. New in-app plugins go there too.
- Integrations are switches under Settings and must be off by default; the app must work fully with all of them off.
- Data lives in localStorage under `ft2:*` keys, one record per day. Never reintroduce a history cap.
- Palette: cream `#fbf7f1`, terracotta `#c2410c` for actions, blue for carbs, amber for fat, green only for good-status signals. Type never below 12px, tap targets 44px.
- `npm run build` must pass (tsc + vite) and `npx eslint src --ignore-pattern src/App.backup.tsx` must be clean before committing. `src/App.backup.tsx` is a stale file with a pre-existing lint error; leave it alone.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
