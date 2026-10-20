# Gut Tracker

A personal, offline-first PWA for tracking GI symptoms, triggers, single-variable intervention trials and lab results.
All data stays on your device (IndexedDB). There is no backend, no account and no analytics.

It is a tracking tool, not a diagnostic tool.

## Features

- **Log** (home): inline Bristol picker with urgency/blood/woke-me-up/incomplete chips. Logging a Bristol 6 with urgency takes 3 taps: type → Urgency → Save. Buttons for meals, the daily check-in, triggers, on-demand doses, eye episodes, weight and the weekly IBS-SSS.
- **Meal recorder**: describe a meal by typing or with the keyboard's dictation mic. Foods and ingredients are recognised on the device (English and Portuguese, with plurals, negations like "sem leite" or "no cheese", and gluten-free, lactose-free, decaf and alcohol-free handled) and trigger tags are suggested, which you can change before saving. The word list is in `src/lib/foodTags.ts`.
- **Weekly IBS-SSS** pre-fills pain days, pain severity and bloating severity from the last 10 days of check-ins (the questionnaire's standard 10-day recall); you adjust them and answer the other two items.
- **Today**: a timeline of each day's entries. Tap an entry to edit or delete it; ‹ › moves between days.
- **Trends**: Bristol stacked bars, stool stats and a Rome IV-style pattern indicator, daily scores with flare days marked, IBS-SSS over time with severity bands and trial spans, trial baseline-vs-trial comparison, exploratory trigger association, on-demand doses vs flare days, and weight.
- **Labs**: preset and custom tests, per-test charts with the reference band shaded, and a "Not yet done" list.
- **More**: interventions and trials (with the single-variable warning), IBS-SSS history, alerts, export/import, CSV zip, "Copy summary for AI analysis", settings, demo data and delete-all.
- **Red-flag rules** are evaluated after every save. Their thresholds live in `src/lib/config.ts`.
- **Reminders**: in-app banners, plus web notifications while the app is running (see the limitation below).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests
npm run build      # production build in dist/
```

To get 60 days of realistic fake data for the charts, go to **More → Settings → Load demo data**. This replaces all existing data. The generator lives in `src/dev/seed.ts`.

## Deploy (to use it on your phone)

The app has to be served over **HTTPS** for installing and offline use to work. Any static host will do:

- **Netlify** or **Vercel** (free, and they work with private repos). Import the GitHub repo; `netlify.toml` / `vercel.json` already contain the build settings. Every push to the default branch redeploys.
- **GitHub Pages** (what this repo uses): set Settings → Pages → Build and deployment → Source to **GitHub Actions**. `.github/workflows/deploy-pages.yml` then deploys on every push to the default branch, to `https://<user>.github.io/<repo>/`. The repo must be public on a free plan. Only code is in the repo, never your data.

## Single-file version (laptop, no hosting)

`npm run build:single` produces `dist-single/gut-tracker.html`, a single self-contained file (~880 kB) that runs when opened straight from disk in Chrome or Edge. It needs no server, no install and no network. CI also attaches it to every run as the `gut-tracker-html` artifact (Actions → latest run → Artifacts).

- Data is saved in the browser's own storage (IndexedDB), so it stays with that browser profile, not with the file. To update, replace the file with a new one; the data stays.
- In Chrome and Edge, every local HTML file shares the same storage. Any other local HTML page opened in that browser could read it.
- There are no notifications. Reminders show as banners.
- If the browser is set to clear site data on exit, the data is lost when the browser closes. Test this before relying on it, and export regularly.
- It does not sync with the phone. Use Export on one device and Import → Merge on the other.

## Install on the phone

- **iPhone (Safari)**: open the URL, tap **Share → Add to Home Screen**, then open it from the home screen. Notifications need iOS 16.4+ and an installed app.
- **Android (Chrome)**: open the URL and tap **Install** in the in-app banner, or use ⋮ → *Install app*.

After the first load it works fully offline.

## Data safety

Your data exists only in this browser on this device. Export a JSON backup regularly (More → Export). The app reminds you after 14 days without one. Uninstalling the app, clearing site data, or (on iOS) not opening the app for a long time can erase the data. Installing the app and the `navigator.storage.persist()` request make eviction less likely.

## Known limitation: reminders

A static PWA with no server cannot schedule a push notification for a time when the app is closed. Reminders show as a banner the next time you open the app, and as a notification if the app is open or recently backgrounded at the reminder time.
