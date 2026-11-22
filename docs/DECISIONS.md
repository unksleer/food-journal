# Fuel Tracker (`com.leeunks.ketojournal`) — Decisions, Releases & Monetization Log

**App Store Name:** Fuel Tracker: Keto Journal  
**App Store ID:** `6762644133`  
**Public App Store URL:** https://apps.apple.com/us/app/fuel-tracker-keto-journal/id6762644133  
**Bundle ID:** `com.leeunks.ketojournal` (Widget target: `com.leeunks.ketojournal.FuelWidget`)  
**GitHub Repository:** https://github.com/unksleer/food-journal  
**Local Mac Codebase:** `/Volumes/UnksData/Code/Apple/food-journal`

---

## 1. Technical & iOS SDK Decisions (Nov 21–22, 2026)

1. **iOS 27 `UIScene` Lifecycle Requirement (`496a711`):**
   - **Problem:** Building with the Xcode 27 / iOS 27 SDK caused UIKit to halt on launch (`EXC_BREAKPOINT` / black screen) with:  
     `Application failed to launch: UIScene life cycle is required for apps built with this SDK.`
   - **Decision & Fix:**
     - Added `UIApplicationSceneManifest` to `ios/App/App/Info.plist`.
     - Added `SceneDelegate` (`UIWindowSceneDelegate`) to `ios/App/App/AppDelegate.swift` to explicitly create the `UIWindow` and set `FuelTrackerViewController()` as the `rootViewController`.
     - Updated `ios/App/App/Base.lproj/Main.storyboard` from `customModule="App"` to `customModule="Protein_Carb_Fuel_Tracker"` and annotated `FuelTrackerViewController` with `@objc(FuelTrackerViewController)`.

2. **Native StoreKit 2 In-App Purchase Architecture (`db53929`):**
   - **Decision:** Implemented StoreKit 2 directly inside the app target (`ios/App/App/StoreKitPlugin.swift`, registered in `FuelTrackerViewController.swift`, wrapped by `src/lib/storekit.ts`) rather than adding a third-party npm billing dependency.
   - **Automatic Grandfathering for Prior Paid-Upfront Buyers:**
     - `StoreKitPlugin.swift` checks `AppTransaction.shared.originalAppVersion < "1.2"` so anyone who bought the app when it was a $0.99 paid-upfront download (`1.0` or `1.1.x`) is automatically unlocked for **Fuel Tracker Pro Lifetime** at no cost.
     - `src/App.tsx` also grandfathers any existing installation that already has logged days in `localStorage`.

3. **External Volume (`dot_clean`) Rule:**
   - Because `/Volumes/UnksData` creates macOS `._*` AppleDouble files, always run `dot_clean -m /Volumes/UnksData/Code/Apple/food-journal` before running `eslint` or `xcodebuild`.

---

## 2. Monetization & Pricing Strategy (Nov 21–22, 2026)

1. **Switched Base App Download from `$0.99 Paid Upfront` → `Free ($0.00)` (Nov 22, 2026):**
   - **Why:** Upfront paywalls block ~98% of App Store browsers and prevent download velocity and in-app 5-star review prompts (`requestReview()` fires after 7 logged days).
   - **Action Taken:** Scheduled and confirmed an immediate global price change in App Store Connect to **`$0.00` (Free)** across all 175 countries/regions.

2. **Created Non-Consumable In-App Purchase (`com.leeunks.ketojournal.pro`):**
   - **Reference Name:** `Fuel Tracker Pro Lifetime` (Apple ID: `6837804281`)
   - **Display Name:** `Fuel Tracker Pro (Lifetime)`
   - **Description:** `Lifetime unlock for all journal and clinic tools.`
   - **Price:** **$4.99 USD** (one-time purchase, no recurring subscription)
   - **Status:** **Approved & Live** (Approved Nov 22, 2026 alongside v1.1.1 Build 2).

3. **v1.2.0 Feature Split (`14-Day Logged Trial` + `$4.99 Pro Power Tools`):**
   - **14-Day Free Trial (Core Journal):**
     - New users get **14 logged days** of full daily VLP (35 cal/oz), LP (55 cal/oz), and MP (75 cal/oz) protein logging by the ounce, net carb & fat logging, quick-add favorites, and morning weight/ketone check-ins for free.
     - On Day 7 (`loggedDayCount >= 7`), the automatic 5-star App Store rating prompt fires while they are still inside their free trial.
     - After 14 logged days (`loggedDayCount >= 14`), logging a new day prompts the `ProSheet` upgrade card ($4.99 one-time unlock). Past logged days, trends, history, and JSON export remain readable at all times.
   - **Fuel Tracker Pro ($4.99 Lifetime Unlock via `src/screens/ProSheet.tsx`):**
     - **Unlimited Daily Logging** beyond the 14-day free trial
     - **Monthly Clinic PDF Printout** (`Export [Month] as PDF · Pro` on the History tab)
     - **Barcode Net-Carb Scanner** (`Scan barcode · Pro` on the Carbs food-entry sheet & Settings)
     - **Home Screen Widget** (carbs left, protein progress, and streak)
     - **Apple Health Integration** (auto-save check-in weight, display daily steps & workouts)
     - **iCloud Sync** (automatic sync across iPhone & iPad)

---

## 3. App Store Connect Releases

| Version | Build | Git Commit | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1.1.0** | `2` | `4c8a203` | Superseded | Terracotta redesign, onboarding, integrations |
| **1.1.1** | `2` | `3f31aff` | **Approved & Live** (Nov 22, 2026) | iOS 27 `UIScene` launch fix + `StoreKitPlugin.swift` + approved `com.leeunks.ketojournal.pro` IAP |
| **1.2.0** | `1` | `427e340` | **Waiting for Review** (Submitted Nov 22, 2026, Submission ID `306ef925-b8e2-4fc6-92fa-9f06e6d3d0d4`) | Adds `ProSheet.tsx` paywall modal gating Monthly Clinic PDF, Barcode Scanner, Widget, Apple Health, and iCloud Sync |

---

## 4. Marketing, ASO, Offer Codes & Apple Search Ads

### A. App Store Optimization (ASO) Metadata (Currently Live)
- **Name:** `Fuel Tracker: Keto Journal`
- **Subtitle:** `Medical weight loss diary`
- **Keywords:** `mediweightloss,medi,ketosis,ketones,carb,net,lean,vlp,lp,mp,ounce,log,counter,plan,clinic,lowcarb`

### B. Free Pro Lifetime Offer Codes (`Clinic and Community Free Pro`)
- **Location in App Store Connect:** *Monetization → In-App Purchases → Fuel Tracker Pro Lifetime → Offer Codes → `Clinic and Community Free Pro`*
- **Expiration:** May 22, 2027 (500 one-time codes generated; unused codes can be deactivated anytime in App Store Connect).
- **Important:** Codes are completely private and are only redeemed when you personally share a link with someone (e.g., clinic nurses/counselors, friends, or community members who ask about your app).
- **First 20 Direct 1-Tap Redemption Links:**
  1. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=TPXHRANWKWP4LT6PME`
  2. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=HF7KN8KXKJFX8HN43Y`
  3. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=7A4LFKKN3W6EX4EAHK`
  4. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=LMXFWEMRJXY7X3H7FF`
  5. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=M3FYFR46T8EPKYFFH3`
  6. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=PEYEWHPW3NLKEMWMK4`
  7. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=AW3837E3KEHNLXYRNF`
  8. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=NXTY6JY7JJ4T7RMJ7L`
  9. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=W3N8XFEN6TLRLWXHPE`
  10. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=M7J3YNH36FN7TLW3NR`
  11. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=PR78J84H3MTJRMYETN`
  12. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=HJHPWKP3MAFLEHH4HE`
  13. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=H6MWA8HTKK7AKHLY6H`
  14. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=RHA8PYAYFW73WWJNJH`
  15. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=MRRR8TE8MYXTYTTJ66`
  16. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=ERN4L3FXMMMMJJHEF7`
  17. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=NRMHJPKNHKAHLTWEN3`
  18. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=EEPKP8838Y78JWRTXM`
  19. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=PLH68MTL4XP8888TML`
  20. `https://apps.apple.com/redeem?ctx=offercodes&id=6762644133&code=A7RAMXEREWTTT3YF3M`

### C. Apple Search Ads (Pre-Built & Paused — $0.00 Spend)
- **Account:** `Lee Unks` (Org ID: `25828540` — `https://app-ads.apple.com/cm/app/25828540/report`)
- **Payment Method:** **Skipped / None on file** (cannot charge anything)
- **Campaign:** `Fuel Tracker - US Search Exact` (Campaign ID: `2145184870`, Status: **Paused**)
- **Settings:** `$2.00/day` budget, `$0.30` Max CPT bid, Search Match `OFF`
- **Exact-Match Keywords:** `[medi weightloss]`, `[medi weight loss]`, `[vlp protein]`, `[protein ounce tracker]`, `[keto food journal]`

### D. Zero-Cost Community Growth Playbook (For Strict "No-Self-Promo" Groups)
1. **Progress Screenshot / Week-in-Review Card Posts:** Share your own weekly weigh-in / net-carb streak screenshot from the app in Medi-Weightloss groups without linking the app in the main post; reply with the App Store link only when members ask *"What app is that?"* in the comments.
2. **Helpful Comment Replies:** Reply to *"How do you track VLP/LP/MP ounces?"* or *"Does MyFitnessPal work for Medi?"* threads.
3. **Clinic Counselor / Nurse Handout:** Show your local clinic counselor the **Monthly Clinic PDF Printout** and give them 2–3 of the 1-tap Pro unlock links above for their own phone.
