# Fire TV Dashboard (World Clocks + Weather + News)

A 10‑foot UI dashboard for Amazon Fire TV / Android TV with local weather, world clocks, and news — built with **React + Vite + Tailwind** and designed for **DPAD navigation**.

## Features (MVP)
- Local city + current weather (auto‑detected)
- World clocks (multiple timezones)
- Top headlines (JSON feed)
- Offline‑friendly caching
- DPAD focus states for TV remote

---

## Requirements
- Node.js 18+ (or 20+)
- npm

---

## Install
```bash
git clone https://github.com/<your-user>/fire-tv-dashboard.git
cd fire-tv-dashboard
npm install
npm run dev
```

Open: http://localhost:5173

---

## Build (Web)
```bash
npm run build
npm run preview
```

---

## Configuration
All data is client‑side; no backend.

### Weather (Open‑Meteo)
- Uses the **Open‑Meteo** API (no key required).
- Inputs: `lat`, `lon`, `timezone`.
- Refresh cadence (recommended):
  - Current weather: **15 min**
  - Forecast: **3 hrs** (if used)

### Location (No GPS)
Detection order:
1. `Intl.DateTimeFormat().resolvedOptions().timeZone`
2. Map timezone → default city
3. Optional IP geo lookup to refine city + lat/lon
4. Manual override in Settings

If no location is found, show “Set your city” CTA.

### News (JSON)
Use a JSON‑first news source with CORS support (avoid RSS):
- Example: `https://inshorts.deta.dev/news?category=technology`
- Cache for **30–60 min** and show cached items offline

---

## DPAD / Remote Navigation
- Use real focusable elements (`button`, `a`)
- Strong visible focus ring
- Avoid click‑only `div`s
- Back behavior:
  - If Settings modal open → close
  - Otherwise → exit app or “press back again to exit”

---

## Suggested Data Models
### City / Clock
```ts
{
  id: string,
  name: string,
  timezone: string, // IANA
  lat?: number,
  lon?: number
}
```

### Cached Weather
```ts
{
  city: string,
  lat: number,
  lon: number,
  timezone: string,
  updatedAt: number,
  current: { temp: number, condition: string, icon: string }
}
```

---

## Fire TV Packaging (two options)
### Option A — Capacitor (recommended)
1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init`
3. `npm run build`
4. `npx cap add android`
5. `npx cap open android`
6. Build signed APK/AAB in Android Studio

### Option B — Native Android TV WebView
- Kotlin shell app with a WebView pointing to bundled local assets
- Uses `assets/` or `file:///android_asset/` to load the Vite build

---

## ADB Install (Fire TV)
```bash
adb connect <fire-tv-ip>
adb install -r app-release.apk
```

---

## Next Milestones
1. UI skeleton + DPAD focus
2. Clocks + settings (add/remove)
3. Weather + caching
4. News + caching
5. Packaging + store assets

---

## License
MIT
