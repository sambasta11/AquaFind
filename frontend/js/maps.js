/* AquaFind maps: Leaflet setup, status pins, routing + turn-by-turn directions */
'use strict';
const MAPS = { lm: null, me: null, mec: null, mk: {}, route: null, pick: null };
const pinIcon = (s, sel) => L.divIcon({
  className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  html: `<div class="pin p-${s.status}${sel ? ' sel' : ''}"><span>${gauge(s.status, 17)}</span></div>`
});
function destroyMap() { if (MAPS.lm) { try { MAPS.lm.remove(); } catch { } } MAPS.lm = MAPS.me = MAPS.mec = MAPS.route = null; MAPS.mk = {}; }

/* kind: 'workspace' (all stations, selectable) | 'preview' (all stations, click opens workspace) | 'station' (one station + line) | 'route' */
function initMap(el, kind, o = {}) {
  if (!el) return null;
  if (!window.L) { el.innerHTML = '<div class="map-fail"><b>The map could not load.</b><span>Check your internet connection and refresh the page.</span></div>'; return null; }
  const u = LC();
  const map = L.map(el, { zoomControl: false, attributionControl: true, ...(kind === 'station' ? { dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false } : {}) });
  MAPS.lm = map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  if (kind !== 'station') L.control.zoom({ position: 'topright' }).addTo(map);
  MAPS.me = L.marker([u.lat, u.lng], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), title: 'You are here', zIndexOffset: 900, keyboard: false }).addTo(map);
  if (LIVE.on && S.loc === LIVE_IDX && LIVE.acc) MAPS.mec = L.circle([u.lat, u.lng], { radius: LIVE.acc, color: '#247BA0', weight: 1, fillColor: '#247BA0', fillOpacity: .12, interactive: false }).addTo(map);
  MAPS.mk = {};
  const bounds = (pts, pad = [48, 48], maxZoom) => map.fitBounds(pts, { padding: pad, maxZoom });
  if (kind === 'workspace' || kind === 'preview') {
    ST.forEach(s => {
      MAPS.mk[s.id] = L.marker([s.lat, s.lng], { icon: pinIcon(s, S.sel === s.id), title: `${s.name}, ${SM[s.status].label}`, alt: s.name })
        .addTo(map).on('click', () => o.onSelect && o.onSelect(s.id));
    });
    if (o.onBlank) map.on('click', o.onBlank);
    const pts = [[u.lat, u.lng], ...ST.filter(s => km(s) < 12).map(s => [s.lat, s.lng])];
    bounds(pts, o.pad || [56, 56]);
  } else {
    const s = get(o.id);
    MAPS.mk[s.id] = L.marker([s.lat, s.lng], { icon: pinIcon(s, true), title: s.name }).addTo(map);
    if (kind === 'station') L.polyline([[u.lat, u.lng], [s.lat, s.lng]], { color: '#247BA0', weight: 2, dashArray: '2 7', lineCap: 'round' }).addTo(map);
    bounds([[u.lat, u.lng], [s.lat, s.lng]], [40, 40], 16);
    if (kind === 'route') loadRoute();
  }
  setTimeout(() => MAPS.lm && MAPS.lm.invalidateSize(), 80);
  return map;
}
function paintPins() { ST.forEach(s => MAPS.mk[s.id] && MAPS.mk[s.id].setIcon(pinIcon(s, S.sel === s.id))); }

/* ---------- Directions ---------- */
const RT = { car: ['routed-car', 'Drive'], bike: ['routed-bike', 'Bike'], foot: ['routed-foot', 'Walk'] };
const fd = m => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1) + ' km';
const ft = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' hr ' + (m % 60) + ' min'; };
const ARW = { left: '↰', right: '↱', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↰', 'sharp right': '↱', straight: '↑', uturn: '↶' };
function stepText(st, dest) {
  const m = st.maneuver, t = m.type, mod = m.modifier || '', on = st.name ? ' onto ' + st.name : '', dir = mod && mod !== 'straight' ? mod : 'straight';
  if (t === 'depart') return 'Head ' + dir + (st.name ? ' on ' + st.name : '');
  if (t === 'arrive') return 'Arrive at ' + dest + (mod === 'left' || mod === 'right' ? ' on your ' + mod : '');
  if (t === 'turn') return mod === 'uturn' ? 'Make a U-turn' + on : mod === 'straight' ? 'Continue straight' + on : 'Turn ' + mod + on;
  if (t === 'end of road') return 'Turn ' + dir + ' at the end of the road' + on;
  if (t === 'merge') return 'Merge ' + dir + on;
  if (t === 'fork') return 'Keep ' + dir + ' at the fork' + on;
  if (t === 'on ramp' || t === 'off ramp') return 'Take the ramp ' + dir + on;
  if (/roundabout|rotary/.test(t)) return 'At the roundabout, take exit ' + (m.exit || '') + on;
  return 'Continue ' + dir + on;
}
async function loadRoute() {
  const map = MAPS.lm, s = get(routeId()), u = LC(), box = () => $('#dirinfo');
  if (!map || !box() || !s) return;
  if (MAPS.route) { try { MAPS.route.remove(); } catch { } MAPS.route = null; }
  box().innerHTML = loader({ inline: true, text: 'Finding the best route...' });
  try {
    const c = new AbortController(), to = setTimeout(() => c.abort(), 12000);
    const r = await fetch(`https://routing.openstreetmap.de/${RT[S.mode][0]}/route/v1/driving/${u.lng},${u.lat};${s.lng},${s.lat}?overview=full&geometries=geojson&steps=true`, { signal: c.signal });
    clearTimeout(to);
    const d = await r.json(); if (d.code !== 'Ok' || !d.routes.length) throw 0;
    if (MAPS.lm !== map || !box()) return;
    const rt = d.routes[0];
    MAPS.route = L.geoJSON(rt.geometry, { style: { color: '#247BA0', weight: 5, opacity: .95 } }).addTo(map);
    map.fitBounds(MAPS.route.getBounds(), { padding: [40, 40] });
    box().innerHTML = `<div class="route-sum"><div><b class="num">${ft(rt.duration)}</b><span>${fd(rt.distance)} · ${RT[S.mode][1]}</span></div>${ico('nav', 24)}</div>
      <ol class="steps">${rt.legs[0].steps.map(st => `<li><span class="stp-i" aria-hidden="true">${st.maneuver.type === 'arrive' ? '⚑' : ARW[st.maneuver.modifier] || '↑'}</span><span>${esc(stepText(st, s.name))}</span><span class="stp-d num">${st.maneuver.type === 'arrive' ? '' : fd(st.distance)}</span></li>`).join('')}</ol>`;
  } catch {
    if (MAPS.lm !== map || !box()) return;
    MAPS.route = L.polyline([[u.lat, u.lng], [s.lat, s.lng]], { color: '#247BA0', weight: 3, dashArray: '2 7' }).addTo(map);
    box().innerHTML = `<div class="note warn"><b>Turn-by-turn directions are not available.</b><span>Check your internet connection. The dotted line shows the straight-line path, ${km(s).toFixed(1)} km.</span><button class="btn sm" data-act="dretry">Try again</button></div>`;
  }
}
