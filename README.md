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

## Layout

- `src/App.tsx` — state, routing between screens, month export to PDF
- `src/screens/` — Today, AddEntrySheet, Checkin, Trends, History, Settings
- `src/components/` — shared UI (cards, progress bars, swipe-to-delete rows, bottom sheet, tab bar)
- `src/lib/nutrition.ts` — tier tables, daily totals, day status, ketone zones
- `src/storage.ts` — localStorage persistence (one record per day, no cap), one-time migration from the v3.1 journal format, backup export/import

## Data

Everything is stored on the device. Settings → Your data exports a JSON backup through the share sheet and imports one back.
