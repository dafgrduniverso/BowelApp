# Gut Tracker

A personal, offline-first PWA for tracking GI symptoms, triggers, single-variable intervention trials and lab results.
All data stays on your device (IndexedDB). There is no backend, no account and no analytics.

It is a tracking tool, not a diagnostic tool.

## Features

- **Log** (home): inline Bristol picker with urgency/blood/woke-me-up/incomplete chips. Logging a Bristol 6 with urgency takes 3 taps: type → Urgency → Save. Buttons for the daily check-in, triggers, on-demand doses, eye episodes, weight and the weekly IBS-SSS.
- **Today**: a timeline of each day's entries. Tap an entry to edit or delete it; ‹ › moves between days.
- **Trends**: Bristol stacked bars, stool stats and a Rome IV-style pattern indicator, daily scores with flare days marked, IBS-SSS over time with severity bands and trial spans, trial baseline-vs-trial comparison, exploratory trigger association, on-demand doses vs flare days, and weight.
- **Labs**: preset and custom tests, per-test charts with the reference band shaded, and a "Not yet done" list.
- **More**: interventions and trials (with the single-variable warning), IBS-SSS history, alerts, export/import, CSV zip, a printable clinician summary, "Copy summary for AI analysis", settings, demo data and delete-all.
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
- **GitHub Pages**: set Settings → Pages → Source to "GitHub Actions". `.github/workflows/deploy-pages.yml` deploys on every push to `main`. A private repo needs a paid GitHub plan for Pages; otherwise make the repo public. Only code is in the repo, never your data.

## Install on the phone

- **iPhone (Safari)**: open the URL, tap **Share → Add to Home Screen**, then open it from the home screen. Notifications need iOS 16.4+ and an installed app.
- **Android (Chrome)**: open the URL and tap **Install** in the in-app banner, or use ⋮ → *Install app*.

After the first load it works fully offline.

## Data safety

Your data exists only in this browser on this device. Export a JSON backup regularly (More → Export). The app reminds you after 14 days without one. Uninstalling the app, clearing site data, or (on iOS) not opening the app for a long time can erase the data. Installing the app and the `navigator.storage.persist()` request make eviction less likely.

## Known limitation: reminders

A static PWA with no server cannot schedule a push notification for a time when the app is closed. Reminders show as a banner the next time you open the app, and as a notification if the app is open or recently backgrounded at the reminder time.
