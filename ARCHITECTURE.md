# WaypointAssistent PRO V4.8 — Architectuurdocumentatie

## Overzicht

De codebase is opgesplitst van één monolithisch HTML/JS bestand (~700 regels) naar een duidelijk gelaagde ES Module structuur. Alle functionaliteit van het prototype is behouden en verbeterd.

---

## Mapstructuur

```
waypointassistent/
├── index.html                    ← Dunne HTML shell (opmaak + imports)
│
├── core/
│   ├── config.js                 ← Activiteitenprofielen, MET-tabellen, constanten
│   ├── state.js                  ← Centrale store: dispatch() + on() + getters
│   └── types.js                  ← JSDoc type-definities (= TypeScript interfaces)
│
├── logic/
│   ├── geo.js                    ← Pure geo-berekeningen (haversine, bearing, projectie)
│   ├── metrics.js                ← MET, kcal, stappen, ETA, formattering
│   ├── gpxParser.js              ← GPX XML → interne RouteState
│   └── routeEngine.js            ← GPS verwerking, waypoint triggers, off-route
│
├── services/
│   ├── gpsService.js             ← Geolocation wrapper (throttle, foutmeldingen)
│   ├── speechService.js          ← Prioriteits-queue, debounce, interrupt
│   └── storageService.js         ← localStorage abstractie (IndexedDB-ready)
│
├── map/
│   ├── mapController.js          ← Leaflet init, base layers, tile wisselen
│   ├── mapRenderer.js            ← Route tekenen, markers, user positie (10 fps)
│   └── mapInteraction.js         ← Kompas, rotatie, north reset
│
├── ui/
│   ├── uiController.js           ← DOM orchestratie, settings sync, UI state
│   └── components/
│       ├── stats.js              ← Live stats DOM writes
│       ├── waypointList.js       ← Waypoint tabel rendering
│       ├── announcements.js      ← Aankondigingenlog
│       ├── tabs.js               ← Tab navigatie
│       └── elevationChart.js     ← Canvas hoogteprofiel
│
└── app/
    └── appController.js          ← Orchestratie: init, GPS, GPX, events
```

---

## Architectuurprincipes

### 1. Centrale State Store (`core/state.js`)

Geïnspireerd op Redux/Flux, zonder de overhead:

- **`dispatch(action, payload)`** — enige manier om state te muteren
- **`on(event, callback)`** — subscribe op specifieke events (returns unsubscribe fn)
- **`getState()`** — frozen snapshot (read-only)
- **Hot-path getters** (`getSession()`, `getRoute()`) — mutable ref voor GPS handler

**Events:**
| Event                 | Wanneer                              |
|-----------------------|--------------------------------------|
| `GPS_UPDATED`         | Elke GPS positie-update              |
| `WAYPOINT_PASSED`     | Waypoint bereikt                     |
| `WAYPOINT_MISSED`     | Waypoint voorbijgegaan               |
| `OFF_ROUTE_DETECTED`  | Afwijking > drempel                  |
| `OFF_ROUTE_ANNOUNCE`  | Progressieve afwijkingsmelding       |
| `ON_ROUTE_RETURNED`   | Terug binnen drempel                 |
| `SESSION_STARTED/PAUSED/RESUMED/STOPPED` | Sessiewijziging    |
| `ROUTE_LOADED`        | GPX succesvol geladen                |

### 2. Gelaagde architectuur

```
HTML (opmaak) 
  ↓ events
app/appController.js (orchestratie)
  ↓ dispatch()            ↑ on()
core/state.js (store)
  ↓ state reads
logic/ (pure functies)    services/ (I/O wrappers)
  ↓ data
map/ + ui/ (weergave)
```

UI modules schrijven **nooit** rechtstreeks naar state. Ze lezen via getters en reageren op events via `on()`.

### 3. Route matching — verbetering t.o.v. prototype

Het prototype gebruikte enkel het dichtstbijzijnde trackpunt (nearest-point lookup).  
De refactoring gebruikt **segment-projectie** (`logic/geo.js → findClosestOnRoute`):

- Per segment AB: projecteer GPS-punt P op AB (parameter t ∈ [0,1])
- Berekent exacte routepositie (meters) op basis van segmentinterpolatie
- Nauwkeuriger voor schaarse trackpunten en scherpe bochten

### 4. Speech service — prioriteitssysteem

| Prioriteit | Wanneer                         | Gedrag                          |
|------------|---------------------------------|---------------------------------|
| `high`     | Off-route detectie              | Onderbreekt huidige spraak      |
| `medium`   | Waypoint bereikt/gemist         | Voor 'low' in de wachtrij       |
| `low`      | Volgende waypoint info, pauze   | Achter in de wachtrij           |

### 5. Performance

- **GPS throttle:** 250 ms (configureerbaar via `APP_CONFIG.GPS_THROTTLE_MS`)
- **Map render:** max 10 fps via timestamp check in `mapRenderer.js`
- **Hot path:** `getSession()` / `getRoute()` geven mutable refs terug (geen object spreading)
- **Heading smoothing:** low-pass filter (`APP_CONFIG.HEADING_SMOOTH_ALPHA = 0.3`)

---

## Build-instructies

### Ontwikkeling (geen build nodig)

```bash
# Serveer de map via een lokale HTTP server (ES modules vereisen dit)
npx serve .
# of
python3 -m http.server 8080
```

Open `http://localhost:8080`.

### Productie met Vite (aanbevolen)

```bash
npm create vite@latest waypointassistent -- --template vanilla
# Kopieer de modules naar de src/ map
npm install
npm run build
# Output in dist/
```

### TypeScript migratie

De codebase is volledig voorbereid voor TypeScript:
- Alle types zijn gedocumenteerd als JSDoc `@typedef`
- Hernoem `.js` → `.ts` en voeg strikte type-annotaties toe
- Gebruik `tsconfig.json` met `"checkJs": true` als tussenstap

---

## Future-proofing hooks

| Feature              | Waar uit te breiden                  |
|----------------------|--------------------------------------|
| PWA / offline        | `services/storageService.js` (IndexedDB) + service worker |
| Backend sync         | Nieuwe `services/syncService.js` die luistert op session events |
| Multi-route          | `core/state.js` → `routeState[]` array |
| User profiles        | `services/storageService.js` + UI settings tab |
| Export GPX/JSON      | Nieuwe `logic/exportService.js`      |
| Analytics/logging    | `on('*', logger)` in appController   |

---

## Codekwaliteitsregels

- Max ~200 regels per bestand (gemiddeld 80–120 in deze versie)
- Functies max ~30 regels
- Geen globale variabelen — alles via modules
- JSDoc op alle publieke functies
- Geen afkortingen als variabelenamen (`bestDist` i.p.v. `bD`)
- HTML-escape voor GPX-content in UI (XSS preventie)
