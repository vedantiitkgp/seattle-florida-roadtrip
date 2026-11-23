# Seattle → Florida Winter Road Trip — live weather & road dashboard

A single-page site that tracks daily weather and winter road risk for a
**Dec 2026 – Jan 2027 Seattle-to-Miami drive**. Built from the original
"Seattle to Florida Road Trip" route plan, with two changes:

- **Live weather everywhere** — each overnight stop pulls its forecast and any
  active winter-storm / cold alerts straight from the **National Weather
  Service** API ([api.weather.gov](https://api.weather.gov), public domain,
  no key).
- **Reroute off Atlanta** — the Southeast leg now runs
  **Nashville → Asheville → Upstate SC (Greenville) → Charleston → Savannah →
  Florida** instead of through Atlanta.

## What it shows

- **Map** (Leaflet + OpenStreetMap) with the full route, every overnight stop
  (incl. the **Klamath Falls, OR pickup**), and the mountain-pass / road
  watch points (W1–W7). Markers recolor by live conditions: green = fine,
  amber = cold / snow risk, red = active NWS alert, purple = pass/road watch.
  **Fullscreen** button expands the map to a modal; **Tag** lets you drop your
  own pins (fuel stops, hazards) — saved in the browser.
- **Live road monitoring** — each watch point pulls active NWS alerts for its
  own coordinates and shows 🟢 clear / 🟡 advisory / 🔴 warning, with the DOT
  link for actual closure status.
- **Daily weather cards** — current conditions plus the next ~6 forecast
  periods for each stop. Cold legs through **Idaho** and **Colorado** (Boise,
  SLC, Grand Junction, Denver) and the Blue Ridge (Asheville) are flagged
  automatically: *hard freeze ≤20°F*, *freezing ≤32°F*, *snow/ice*.
- **Watch points** — the high-elevation segments that close for snow
  (Columbia Gorge, Cabbage Hill, Glenwood Canyon, Vail Pass, Eisenhower
  Tunnel, Pigeon River Gorge), each linking its official DOT feed.
- **State 511 feeds** — direct links to every state DOT along the route.

> Forecasts reach ~7 days out, so each stop shows the current forecast at that
> location and rolls into the real travel-day outlook as the date nears.

## Run it

Pure static — no build, no backend. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

Append `?selftest` to the URL to run the cold-classifier unit checks in the
console.

## Deploy

Hosted via **GitHub Pages** from the repo root (`main` branch).

## Data & credits

- Weather: NOAA / National Weather Service — `api.weather.gov` (public domain).
- Map: Leaflet, © OpenStreetMap contributors.
- Road status: each state's DOT (ODOT, Idaho 511, UDOT, COtrip, KanDrive,
  MoDOT, TN SmartWay, DriveNC, SCDOT, 511GA, FL511).

Forecasts are advisory — **always confirm road closures on the official DOT
feed before driving a mountain leg.**
