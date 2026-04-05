# StormRouter

A React Native Android app for storm chasers that pulls live NWS severe weather alerts, renders warning polygons on a map, calculates storm motion vectors, and routes you to an intercept point — all using free APIs.

> **Screenshots** — *coming soon*

---

## Features

- Live severe weather alerts from the [NWS API](https://www.weather.gov/documentation/services-web-api) (Tornado Warnings, SVR, Flash Flood, PDS, etc.)
- Warning polygons color-coded by severity on a Google Maps base
- Storm motion arrows with speed labels (parsed from NWS alert parameters)
- Calculates distance from your GPS to the nearest polygon edge
- Computes a suggested intercept point 15 miles ahead of the storm's projected path
- Routes you to the intercept point via the free [OSRM routing API](http://project-osrm.org/) (no API key required)
- Bottom sheet detail panel: event type, WFO, expiration, distance, drive ETA, raw NWS description
- Alert list view sorted by proximity with filter/search
- Auto-refresh every 60 seconds
- Pulsing user location marker

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| JDK | 17+ (OpenJDK recommended) |
| Android SDK | API 33 (target), API 24 (min) |
| Android Studio | Hedgehog or newer |
| React Native CLI | 0.73+ |

Set the following environment variables:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/storm-router.git
cd storm-router/StormRouter

# 2. Install JS dependencies
npm install

# 3. (Optional) Add your Google Maps API key
#    Edit android/app/src/main/AndroidManifest.xml:
#    Replace YOUR_GOOGLE_MAPS_API_KEY_HERE with a key from console.cloud.google.com
#    The app works without a key in debug builds on most devices.

# 4. Start Metro
npm start

# 5. Run on Android (separate terminal)
npm run android
```

---

## Build for Release

```bash
cd android
./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk
```

---

## Project Structure

```
src/
├── api/
│   ├── nwsApi.ts        — NWS /alerts/active fetcher + Nominatim geocoder
│   └── osrmApi.ts       — OSRM driving route fetcher
├── components/
│   ├── AlertBottomSheet.tsx   — Slide-up detail panel
│   ├── AlertListItem.tsx      — Row component for list view
│   ├── AlertPolygon.tsx       — react-native-maps Polygon wrapper
│   ├── RouteOverlay.tsx       — Polyline + intercept badge on map
│   ├── StormMotionArrow.tsx   — Dashed arrow showing storm vector
│   └── UserLocationMarker.tsx — Pulsing GPS dot
├── hooks/
│   ├── useAlerts.ts     — NWS polling + auto-refresh
│   └── useLocation.ts   — GPS watch + manual entry
├── screens/
│   ├── MapScreen.tsx    — Main map view
│   └── ListScreen.tsx   — Proximity-sorted alert list
├── utils/
│   ├── alerts.ts        — Storm motion parser, formatters
│   └── geometry.ts      — Turf.js wrappers: distance, intercept, coordinate conversion
├── constants/index.ts   — Colors, event codes, API URLs
└── types/index.ts       — TypeScript interfaces
```

---

## API References

| API | Docs |
|-----|------|
| NWS Alerts | https://www.weather.gov/documentation/services-web-api#/default/get_alerts_active |
| NWS Alert Schema | https://api.weather.gov/schemas/Alert.json |
| OSRM Routing | http://project-osrm.org/docs/v5.24.0/api/ |
| Nominatim Geocoding | https://nominatim.org/release-docs/develop/api/Search/ |
| Turf.js | https://turfjs.org/docs/ |

---

## Tech Stack

- **React Native 0.73** (CLI, not Expo)
- **react-native-maps** — Google Maps rendering
- **react-native-geolocation-service** — GPS
- **@turf/turf** — polygon math (distance, bearing, destination, nearest-point-on-line)
- **axios** — HTTP client
- **@gorhom/bottom-sheet** + **react-native-reanimated** — animated bottom sheet
- **@react-navigation/bottom-tabs** — tab navigation

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable releases |
| `dev` | Active development |

---

## License

MIT
