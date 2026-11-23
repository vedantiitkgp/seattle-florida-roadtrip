"use strict";

/* ------------------------------------------------------------------ *
 * Seattle -> Florida winter road trip — live weather & road dashboard
 * Data: National Weather Service (api.weather.gov, public domain, CORS).
 * Route was rerouted off Atlanta -> through Upstate SC + Savannah.
 * ------------------------------------------------------------------ */

// Overnight stops in travel order. lat/lon rounded to 4 dp (NWS requirement).
// cold:true marks legs where a hard freeze / snow is expected (ID, CO, high country).
const STOPS = [
  { name: "Seattle",        state: "WA", lat: 47.6062,  lon: -122.3321, date: "Dec 16", role: "start" },
  { name: "Portland",       state: "OR", lat: 45.5152,  lon: -122.6784, date: "Dec 16" },
  { name: "Klamath Falls",  state: "OR", lat: 42.2249,  lon: -121.7817, date: "Dec 17 · pickup", cold: true,
    note: "Pickup point. High desert ~4,100 ft — US-97/US-20 toward Bend can be snowy/icy." },
  { name: "Boise",          state: "ID", lat: 43.6150,  lon: -116.2023, date: "Dec 18", cold: true,
    note: "Snake River Plain — I-84 ice/freezing fog common." },
  { name: "Salt Lake City", state: "UT", lat: 40.7608,  lon: -111.8910, date: "Dec 18", cold: true,
    note: "Wasatch Front inversions; I-80/I-15 snow." },
  { name: "Grand Junction", state: "CO", lat: 39.0639,  lon: -108.5506, date: "Dec 19", cold: true,
    note: "Staging point before the I-70 passes." },
  { name: "Denver",         state: "CO", lat: 39.7392,  lon: -104.9903, date: "Dec 20–21", cold: true,
    note: "Buffer day built in for pass closures." },
  { name: "Salina",         state: "KS", lat: 38.8403,  lon:  -97.6114, date: "Dec 22" },
  { name: "St. Louis",      state: "MO", lat: 38.6270,  lon:  -90.1994, date: "Dec 23",
    note: "Watch for freezing rain / ice across MO." },
  { name: "Nashville",      state: "TN", lat: 36.1627,  lon:  -86.7816, date: "Dec 24" },
  { name: "Asheville",      state: "NC", lat: 35.5951,  lon:  -82.5515, date: "Dec 25", cold: true,
    note: "Blue Ridge — I-40 Pigeon River Gorge can ice/close." },
  { name: "Greenville",     state: "SC", lat: 34.8526,  lon:  -82.3940, date: "Dec 26",
    note: "Upstate SC — first warm-up of the trip." },
  { name: "Charleston",     state: "SC", lat: 32.7765,  lon:  -79.9311, date: "Dec 27" },
  { name: "Savannah",       state: "GA", lat: 32.0809,  lon:  -81.0912, date: "Dec 28" },
  { name: "St. Augustine",  state: "FL", lat: 29.9012,  lon:  -81.3124, date: "Dec 29" },
  { name: "Orlando",        state: "FL", lat: 28.5384,  lon:  -81.3789, date: "Dec 30" },
  { name: "Miami",          state: "FL", lat: 25.7617,  lon:  -80.1918, date: "Dec 31", role: "end" },
];

// High-elevation / known-closure segments carried from the route plan (W1–W6) + the reroute (W7).
const WATCH = [
  { id: "W1", name: "Columbia Gorge, I-84",       lat: 45.7100, lon: -121.5100, elev: "~1,000 ft", st: "OR",
    why: "Gorge wind + ice; first snow gate east of Portland.", src: "ODOT TripCheck", url: "https://tripcheck.com/" },
  { id: "W2", name: "Cabbage Hill / Blue Mtns, I-84", lat: 45.6700, lon: -118.8500, elev: "4,193 ft", st: "OR",
    why: "6% grade, chain-up zone; closes in snow.", src: "ODOT TripCheck", url: "https://tripcheck.com/" },
  { id: "W3", name: "SLC approaches, I-84/I-15",  lat: 40.8500, lon: -112.0500, elev: "~4,200 ft", st: "UT",
    why: "Lake-effect snow bands near the valley.", src: "UDOT Traffic", url: "https://www.udottraffic.utah.gov/" },
  { id: "W4", name: "Glenwood Canyon, I-70",      lat: 39.5500, lon: -107.3200, elev: "~5,800 ft", st: "CO",
    why: "Narrow canyon; rock/ice closures, no detour.", src: "COtrip", url: "https://www.cotrip.org/" },
  { id: "W5", name: "Vail Pass, I-70",            lat: 39.5300, lon: -106.2200, elev: "10,662 ft", st: "CO",
    why: "Closes 15–25×/season; traction law.", src: "COtrip", url: "https://www.cotrip.org/" },
  { id: "W6", name: "Eisenhower–Johnson Tunnel, I-70", lat: 39.6800, lon: -105.9000, elev: "11,158 ft", st: "CO",
    why: "Highest point of the trip; metering in storms.", src: "COtrip", url: "https://www.cotrip.org/" },
  { id: "W7", name: "Pigeon River Gorge, I-40",   lat: 35.7500, lon:  -83.1000, elev: "~1,600 ft", st: "NC/TN",
    why: "Smokies — ice, rockslide, recurring closures on the reroute.", src: "DriveNC", url: "https://drivenc.gov/" },
];

// Official state road feeds, in travel order.
const DOT = [
  { st: "Oregon",         src: "ODOT TripCheck",   url: "https://tripcheck.com/" },
  { st: "Idaho",          src: "Idaho 511",        url: "https://511.idaho.gov/" },
  { st: "Utah",           src: "UDOT Traffic",     url: "https://www.udottraffic.utah.gov/" },
  { st: "Colorado",       src: "COtrip",           url: "https://www.cotrip.org/" },
  { st: "Kansas",         src: "KanDrive",         url: "https://www.kandrive.gov/" },
  { st: "Missouri",       src: "MoDOT Traveler",   url: "https://traveler.modot.org/" },
  { st: "Tennessee",      src: "TN SmartWay",      url: "https://smartway.tn.gov/traffic" },
  { st: "North Carolina", src: "DriveNC",          url: "https://drivenc.gov/" },
  { st: "South Carolina", src: "SCDOT 511",        url: "https://www.511sc.org/" },
  { st: "Georgia",        src: "511 Georgia",      url: "https://511ga.org/" },
  { st: "Florida",        src: "FL511",            url: "https://fl511.com/" },
];

// Curated iconic + scenic stops per overnight (travel order follows STOPS).
const PLACES = {
  "Seattle":        [["🏛","Pike Place Market","The original public market — fishmongers, the first Starbucks."],
                     ["🌲","Kerry Park","Best skyline + Mt. Rainier viewpoint in the city."],
                     ["🗼","Space Needle","360° observation deck over Puget Sound."]],
  "Portland":       [["📚","Powell's City of Books","Largest independent bookstore in the world."],
                     ["💧","Multnomah Falls","620-ft falls in the Columbia Gorge, just east on I-84."],
                     ["🍩","Voodoo Doughnut","Portland's cult doughnut shop."]],
  "Klamath Falls":  [["🏔","Crater Lake NP","Deepest lake in the US — snow-globe rim in winter (check road access)."],
                     ["🚶","Link River Trail","Easy riverside walk with bird life."],
                     ["🖼","Favell Museum","Western art & Native American artifacts."]],
  "Boise":          [["🏛","Idaho State Capitol","Geothermally heated statehouse, free to tour."],
                     ["🚲","Boise River Greenbelt","25-mi tree-lined path along the river."],
                     ["⛷","Bogus Basin","Mountain rec area 45 min up — skiing & snow play."]],
  "Salt Lake City": [["⛪","Temple Square","Historic LDS campus in the city center."],
                     ["🦬","Antelope Island SP","Bison herds on a Great Salt Lake causeway."],
                     ["🏔","Cottonwood Canyons","Big & Little Cottonwood — world-class snow 30 min away."]],
  "Grand Junction": [["🪨","Colorado National Monument","Red-rock canyons & Rim Rock Drive."],
                     ["🏔","Grand Mesa","Largest flat-top mountain on earth; snowy in winter."],
                     ["🍷","Downtown Main Street","Walkable art-on-the-corner district & wineries."]],
  "Denver":         [["🎸","Red Rocks","Amphitheatre in natural red sandstone — free to walk."],
                     ["🚉","Union Station","Restored rail hall, bars & restaurants."],
                     ["🏔","Rocky Mountain NP","Alpine park ~1.5 hr NW (winter-limited roads)."]],
  "Salina":         [["🦁","Rolling Hills Zoo","Well-regarded zoo & wildlife museum."],
                     ["🏛","Smoky Hill Museum","Free local history museum downtown."]],
  "St. Louis":      [["🌉","Gateway Arch","630-ft arch with a tram to the top."],
                     ["🌳","Forest Park","Bigger than Central Park — free zoo & art museum."],
                     ["🏰","City Museum","Surreal playground built from salvage."]],
  "Nashville":      [["🎶","Broadway Honky-Tonks","Live music bars end to end."],
                     ["🎤","Grand Ole Opry","The home of country music."],
                     ["🏛","Country Music Hall of Fame","The genre's definitive museum."]],
  "Asheville":      [["🏰","Biltmore Estate","America's largest home, lit for the holidays."],
                     ["🛣","Blue Ridge Parkway","Mountain overlooks (watch winter closures)."],
                     ["🎨","River Arts District","Working studios & breweries."]],
  "Greenville":     [["💧","Falls Park on the Reedy","Downtown waterfall & suspension bridge."],
                     ["🚲","Swamp Rabbit Trail","Greenway from downtown to Travelers Rest."],
                     ["🍽","Main Street","Tree-lined, award-winning walkable downtown."]],
  "Charleston":     [["🌈","Rainbow Row & Battery","Pastel row houses & harborfront promenade."],
                     ["🏰","Fort Sumter","Ferry to where the Civil War began."],
                     ["🌳","Waterfront Park","Pineapple fountain & pier swings."]],
  "Savannah":       [["🌳","Forsyth Park","Spanish-moss oaks & the famous fountain."],
                     ["🏛","Historic Squares","22 leafy squares to wander."],
                     ["🚢","River Street","Cobblestone riverfront, shops & candy."]],
  "St. Augustine":  [["🏰","Castillo de San Marcos","1600s Spanish stone fort on the bay."],
                     ["🚶","St. George Street","Pedestrian old-town lane."],
                     ["💡","St. Augustine Lighthouse","Climb for coastal views."]],
  "Orlando":        [["🎢","Walt Disney World","The big one — four parks."],
                     ["🧙","Universal Orlando","Harry Potter & thrill rides."],
                     ["🚀","Kennedy Space Center","Rocket history ~1 hr east on the coast."]],
  "Miami":          [["🏖","South Beach","Art-deco strip & the ocean — journey's end."],
                     ["🎨","Wynwood Walls","Open-air street-art district."],
                     ["🎺","Little Havana / Calle Ocho","Cuban cafés, cigars & domino park."]],
};

const COLD_HARD = 20;   // °F — hard freeze
const COLD_FREEZE = 32; // °F — freezing
const WINTRY = /(snow|sleet|ice|icy|freezing|blizzard|wintry|flurries|wind chill)/i;

/* Pure classifier — the one piece of real logic, unit-tested below.
 * Given NWS forecast periods, return {min, wintry, level} where level is
 * '' | 'freeze' | 'hard'. Looks at the next `n` periods only. */
function classify(periods, n = 6) {
  const slice = (periods || []).slice(0, n);
  let min = Infinity, wintry = false;
  for (const p of slice) {
    if (typeof p.temperature === "number") min = Math.min(min, p.temperature);
    if (WINTRY.test(p.shortForecast || "") || WINTRY.test(p.detailedForecast || "")) wintry = true;
  }
  const level = min <= COLD_HARD ? "hard" : min <= COLD_FREEZE ? "freeze" : "";
  return { min: min === Infinity ? null : min, wintry, level };
}

/* ----------------------------- networking ----------------------------- */
async function nws(path, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch("https://api.weather.gov" + path, {
        headers: { Accept: "application/geo+json" },
      });
      if (r.ok) return r.json();
      if (r.status === 404) return null; // no data for this point
    } catch (e) { /* retry */ }
    await new Promise(res => setTimeout(res, 400));
  }
  throw new Error("NWS unavailable: " + path);
}

async function fetchStop(s) {
  const pts = await nws(`/points/${s.lat},${s.lon}`);
  if (!pts) throw new Error("no gridpoint");
  const fcUrl = pts.properties.forecast;
  const [fc, al] = await Promise.all([
    fetch(fcUrl, { headers: { Accept: "application/geo+json" } }).then(r => r.json()),
    nws(`/alerts/active?point=${s.lat},${s.lon}`).catch(() => null),
  ]);
  const periods = fc.properties.periods;
  const alerts = ((al && al.features) || [])
    .map(f => f.properties)
    .filter(p => WINTRY.test(p.event) || /cold|freeze|frost|storm/i.test(p.event));
  return { periods, alerts, cls: classify(periods) };
}

/* ------------------------------ rendering ------------------------------ */
const $ = sel => document.querySelector(sel);
const markers = {};
const watchMarkers = {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

function dotColor(s, w) {
  if (w && w.alerts && w.alerts.length) return "var(--alert)";
  if (s.role === "start" || s.role === "end") return "var(--accent)";
  if (s.cold || (w && w.cls && (w.cls.level || w.cls.wintry))) return "var(--cold)";
  return "var(--ok)";
}

function buildMap() {
  const map = L.map("map", { scrollWheelZoom: false }).setView([41, -100], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  L.polyline(STOPS.map(s => [s.lat, s.lon]), {
    color: "#4ea1ff", weight: 3, opacity: .75, dashArray: "6 6",
  }).addTo(map);

  STOPS.forEach(s => {
    const m = L.circleMarker([s.lat, s.lon], {
      radius: s.role ? 9 : 7, color: "#0b0e13", weight: 1.5,
      fillColor: s.cold ? "#f0a830" : s.role ? "#4ea1ff" : "#46b36b", fillOpacity: 1,
    }).addTo(map).bindPopup(`<div class="pop-name">${s.name}, ${s.state}</div>
      <div class="pop-meta">${s.date} · loading weather…</div>`);
    markers[s.name] = m;
  });

  WATCH.forEach(w => {
    watchMarkers[w.id] = L.circleMarker([w.lat, w.lon], {
      radius: 6, color: "#0b0e13", weight: 1, fillColor: "#c678dd", fillOpacity: 1,
    }).addTo(map).bindPopup(
      `<div class="pop-name">${w.id} · ${w.name}</div>
       <div class="pop-meta">${w.elev} · ${w.why}<br><a href="${w.url}" target="_blank" rel="noopener">${w.src} →</a></div>`);
  });

  const bounds = L.latLngBounds(STOPS.map(s => [s.lat, s.lon]));
  map.fitBounds(bounds.pad(0.12));

  setupFullscreen(map);
  setupTagging(map);
  return map;
}

/* ---- fullscreen modal ---- */
function setupFullscreen(map) {
  const sec = $("#map-section"), full = $("#full-btn"), close = $("#close-full");
  const open = on => {
    sec.classList.toggle("full", on);
    full.hidden = on; close.hidden = !on;
    setTimeout(() => map.invalidateSize(), 80);
  };
  full.addEventListener("click", () => open(true));
  close.addEventListener("click", () => open(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && sec.classList.contains("full")) open(false); });
}

/* ---- user tagging (persisted in localStorage) ---- */
const TAGS_KEY = "rt_tags";
let tags = (() => { try { return JSON.parse(localStorage.getItem(TAGS_KEY) || "[]"); } catch { return []; } })();
let tagging = false;
function persistTags() { try { localStorage.setItem(TAGS_KEY, JSON.stringify(tags.map(({ _mk, ...r }) => r))); } catch {} }

function setupTagging(map) {
  const layer = L.layerGroup().addTo(map);
  const btn = $("#tag-btn");
  const draw = t => {
    t._mk = L.marker([t.lat, t.lng]).addTo(layer).bindPopup(
      `<div class="pop-name">📌 ${esc(t.label)}</div>
       <button class="map-btn" onclick="removeTag('${t.id}')">Remove</button>`);
  };
  tags.forEach(draw);
  window.removeTag = id => {
    const t = tags.find(x => x.id === id);
    if (t && t._mk) layer.removeLayer(t._mk);
    tags = tags.filter(x => x.id !== id);
    persistTags();
  };
  btn.addEventListener("click", () => {
    tagging = !tagging;
    btn.classList.toggle("on", tagging);
    $("#map").style.cursor = tagging ? "crosshair" : "";
    btn.textContent = tagging ? "📌 Tagging — click map" : "📌 Tag";
  });
  map.on("click", e => {
    if (!tagging) return;
    const label = prompt("Tag this spot (e.g. 'Fuel stop', 'Icy — avoid', 'Lunch'):");
    if (!label) return;
    const t = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      lat: +e.latlng.lat.toFixed(4), lng: +e.latlng.lng.toFixed(4), label };
    tags.push(t); draw(t); persistTags();
  });
}

function stopCard(s) {
  const el = document.createElement("div");
  el.className = "card";
  el.id = "card-" + s.name.replace(/\W+/g, "");
  el.innerHTML = `<div class="card-top"><h3>${s.name} <span class="state">${s.state}</span></h3>
      <span class="date">${s.date}</span></div>
    <div class="body"><span class="err"><span class="spin">↻</span> loading NWS forecast…</span></div>`;
  return el;
}

function fillCard(s, w) {
  const card = $("#card-" + s.name.replace(/\W+/g, ""));
  const body = card.querySelector(".body");
  const cur = w.periods[0];
  const cls = w.cls;
  const badges = [];
  if (cls.level === "hard") badges.push(`<span class="badge cold">Hard freeze ${cls.min}°F</span>`);
  else if (cls.level === "freeze") badges.push(`<span class="badge freeze">Freezing ${cls.min}°F</span>`);
  if (cls.wintry) badges.push(`<span class="badge snow">Snow / ice</span>`);
  if (w.alerts.length) badges.push(`<span class="badge alert">${w.alerts.length} alert${w.alerts.length>1?"s":""}</span>`);

  const strip = w.periods.slice(0, 5).map(p => {
    const c = typeof p.temperature === "number" && p.temperature <= COLD_FREEZE ? " cold" : "";
    return `<div class="d${c}"><b>${p.temperature}°</b><span>${p.name}</span></div>`;
  }).join("");

  const alertBanner = w.alerts.length
    ? `<div class="alert-banner"><b>${w.alerts[0].event}</b> — ${(w.alerts[0].headline || "").slice(0, 110)}</div>`
    : "";

  const road = s.cold
    ? `<div class="road-link">🛣 <a href="${dotUrlFor(s.state)}" target="_blank" rel="noopener">Check ${s.state} road status →</a></div>`
    : "";

  body.innerHTML = `${alertBanner}
    ${badges.length ? `<div class="badges">${badges.join("")}</div>` : ""}
    <div class="now">
      ${cur.icon ? `<img src="${cur.icon}" alt="">` : ""}
      <div><div class="temp">${cur.temperature}°${cur.temperatureUnit}</div>
      <div class="now-txt">${cur.name}: ${cur.shortForecast}</div></div>
    </div>
    ${s.note ? `<div class="now-txt">${s.note}</div>` : ""}
    <div class="strip">${strip}</div>
    ${road}`;

  if (cls.level || cls.wintry) card.classList.add("cold");
  if (w.alerts.length) card.classList.add("alert");

  const m = markers[s.name];
  if (m) {
    m.setStyle({ fillColor: w.alerts.length ? "#ef4b4b" : (cls.level || cls.wintry || s.cold) ? "#f0a830" : (s.role ? "#4ea1ff" : "#46b36b") });
    m.setPopupContent(`<div class="pop-name">${s.name}, ${s.state}</div>
      <div class="pop-meta">${s.date} · ${cur.temperature}°${cur.temperatureUnit}, ${cur.shortForecast}
      ${w.alerts.length ? `<br><b style="color:#ef4b4b">${w.alerts[0].event}</b>` : ""}</div>`);
  }
  return w.alerts;
}

function failCard(s, msg) {
  const card = $("#card-" + s.name.replace(/\W+/g, ""));
  card.querySelector(".body").innerHTML =
    `<span class="err">Forecast unavailable (${msg}). <a href="https://forecast.weather.gov/MapClick.php?lat=${s.lat}&lon=${s.lon}" target="_blank" rel="noopener">Open NWS →</a></span>`;
}

/* Live road-segment monitor: active NWS alerts at each watch point.
 * NWS has no closure API, but Winter Storm/Ice Warnings at a pass are the
 * authoritative heads-up; the DOT link stays for actual closure status. */
async function fetchWatch(w) {
  const al = await nws(`/alerts/active?point=${w.lat},${w.lon}`).catch(() => null);
  const road = ((al && al.features) || []).map(f => f.properties)
    .filter(p => WINTRY.test(p.event) || /wind|storm|ice|snow|cold|flood|fog/i.test(p.event));
  let level = "ok";
  if (road.some(p => /warning/i.test(p.event) || p.severity === "Severe" || p.severity === "Extreme")) level = "warn";
  else if (road.length) level = "advisory";
  return { road, level };
}

function fillWatch(w, r) {
  const slot = document.querySelector("#watch-" + w.id + " .wstatus");
  const meta = { ok: ["🟢", "No active NWS alerts", "ok"],
    advisory: ["🟡", "Advisory in effect", "advisory"], warn: ["🔴", "Warning in effect", "warn"] }[r.level];
  slot.innerHTML = `<span class="wbadge ${meta[2]}">${meta[0]} ${meta[1]}</span>` +
    (r.road.length ? `<div class="alert-banner"><b>${r.road[0].event}</b> ${esc((r.road[0].headline || "").slice(0, 100))}</div>` : "");
  const m = watchMarkers[w.id];
  if (m) m.setStyle({ fillColor: r.level === "warn" ? "#ef4b4b" : r.level === "advisory" ? "#f0a830" : "#c678dd" });
}

function dotUrlFor(state) {
  const map = { OR:"Oregon", ID:"Idaho", UT:"Utah", CO:"Colorado", KS:"Kansas", MO:"Missouri",
    TN:"Tennessee", NC:"North Carolina", SC:"South Carolina", GA:"Georgia", FL:"Florida", WA:"Oregon" };
  const row = DOT.find(d => d.st === map[state]);
  return row ? row.url : "https://www.weather.gov/";
}

function renderStatic() {
  $("#watch").innerHTML = WATCH.map(w => `<div class="watch-card" id="watch-${w.id}">
    <h3>${w.id} · ${w.name} <span class="state">${w.st}</span></h3>
    <div class="elev">▲ ${w.elev}</div>
    <div class="wstatus"><span class="err"><span class="spin">↻</span> checking NWS…</span></div>
    <p>${w.why}</p>
    <p>🛣 <a href="${w.url}" target="_blank" rel="noopener">${w.src} — live status →</a></p>
  </div>`).join("");

  $("#dot-list").innerHTML = DOT.map(d => `<a href="${d.url}" target="_blank" rel="noopener">
    <span class="st">${d.st}</span><span class="src">${d.src} →</span></a>`).join("");

  const cards = $("#cards");
  STOPS.forEach(s => cards.appendChild(stopCard(s)));

  renderPlaces();
}

function renderPlaces() {
  $("#places").innerHTML = STOPS.filter(s => PLACES[s.name]).map(s => `
    <div class="place-stop">
      <h3>${s.name} <span class="state">${s.state}</span> <span class="date">${s.date}</span></h3>
      <div class="place-grid">${PLACES[s.name].map(([icon, name, blurb]) => `
        <div class="place">
          <div class="p-ico">${icon}</div>
          <div><div class="p-name">${name}</div><div class="p-blurb">${blurb}</div>
            <a class="p-map" href="https://www.google.com/maps/search/${encodeURIComponent(name + " " + s.name + " " + s.state)}" target="_blank" rel="noopener">Map →</a>
          </div>
        </div>`).join("")}</div>
    </div>`).join("");
}

function setupTabs(map) {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.toggle("on", x === t));
    document.querySelectorAll(".tab-panel").forEach(p => { p.hidden = p.id !== "tab-" + t.dataset.tab; });
    if (t.dataset.tab === "dashboard") setTimeout(() => map.invalidateSize(), 60);
  }));
}

async function loadWeather() {
  const btn = $("#refresh");
  btn.disabled = true;
  $("#updated").textContent = "fetching live NWS data…";
  const allAlerts = [];

  // Fire all, settle individually so one failure never blocks the rest.
  await Promise.all([
    ...STOPS.map(async s => {
      try {
        const w = await fetchStop(s);
        const alerts = fillCard(s, w);
        alerts.forEach(a => allAlerts.push({ s, a }));
      } catch (e) {
        failCard(s, e.message);
      }
    }),
    ...WATCH.map(async w => {
      try {
        const r = await fetchWatch(w);
        fillWatch(w, r);
        r.road.forEach(a => allAlerts.push({ s: { name: w.id + " " + w.name, state: w.st }, a }));
      } catch (e) {
        const slot = document.querySelector("#watch-" + w.id + " .wstatus");
        if (slot) slot.innerHTML = `<span class="err">status check failed — use DOT link</span>`;
      }
    }),
  ]);

  // Route-wide alert banner
  const sec = $("#alerts-section"), list = $("#alerts-list");
  if (allAlerts.length) {
    const seen = new Set();
    list.innerHTML = allAlerts.filter(({ a }) => {
      const k = a.id || a.event + a.areaDesc; if (seen.has(k)) return false; seen.add(k); return true;
    }).map(({ s, a }) => `<div class="alert-banner"><b>${a.event}</b> · ${s.name}, ${s.state} — ${(a.headline || a.areaDesc || "").slice(0,140)}</div>`).join("");
    sec.hidden = false;
  } else {
    sec.hidden = true;
  }

  $("#updated").textContent = "Updated " + new Date().toLocaleString();
  btn.disabled = false;
}

/* ------------------------------- self test ------------------------------ */
function selftest() {
  const freezing = [{ temperature: 15, shortForecast: "Snow" }, { temperature: 28, shortForecast: "Cloudy" }];
  const warm = [{ temperature: 70, shortForecast: "Sunny" }, { temperature: 55, shortForecast: "Clear" }];
  const a = classify(freezing), b = classify(warm);
  console.assert(a.level === "hard" && a.min === 15 && a.wintry === true, "cold case", a);
  console.assert(b.level === "" && b.wintry === false, "warm case", b);
  console.assert(classify([{ temperature: 30, shortForecast: "Rain" }]).level === "freeze", "freeze boundary");
  console.log("selftest: PASS");
}

/* --------------------------------- boot --------------------------------- */
if (location.search.includes("selftest")) {
  selftest();
} else {
  renderStatic();
  const map = buildMap();
  setupTabs(map);
  loadWeather();
  $("#refresh").addEventListener("click", loadWeather);
}
