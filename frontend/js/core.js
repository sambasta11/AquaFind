/* AquaFind core: helpers, icons, status system, state, API layer, live location. Loaded first. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = 60000;

/* ---------- Icons (1.6px stroke, 24px grid) ---------- */
const IC = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  heart: 'M19.8 6.2a4.6 4.6 0 0 0-6.5 0L12 7.5l-1.3-1.3a4.6 4.6 0 0 0-6.5 6.5L12 20.5l7.8-7.8a4.6 4.6 0 0 0 0-6.5z',
  user: 'M19 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 5 19.5V21M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 3 18.5V20M9.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM21 20v-1.5a3.5 3.5 0 0 0-2.5-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  bell: 'M18 9a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9M13.7 20a2 2 0 0 1-3.4 0',
  pin: 'M12 21s7-6 7-11.5a7 7 0 0 0-14 0C5 15 12 21 12 21zM12 7a2.6 2.6 0 1 0 0 5.2A2.6 2.6 0 0 0 12 7z',
  phone: 'M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8A17.5 17.5 0 0 1 3.7 6.1 1.8 1.8 0 0 1 5.5 4h2.6a1.8 1.8 0 0 1 1.8 1.5c.1.9.4 1.8.7 2.6a1.8 1.8 0 0 1-.4 1.9L9 11.2a14 14 0 0 0 5.8 5.8l1.2-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.7.6 2.6.7A1.8 1.8 0 0 1 21 16.9z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  back: 'M15 18l-6-6 6-6',
  nav: 'M4 11.5 20 4l-7.5 16-1.8-6.7z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 6.5l9 6.5 9-6.5',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7.5a4 4 0 0 1 8 0V11',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  eyeoff: 'M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a2.5 2.5 0 0 0 3.2 3.2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  shield: 'M12 21s7.5-3.6 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.400 12 21 12 21z',
  plus: 'M12 5v14M5 12h14',
  send: 'M21 3 10 14M21 3l-6.500 18-3.500-8-8-3.500z',
  refresh: 'M20 11a8 8 0 0 0-14.500-4M4 5v4h4M4 13a8 8 0 0 0 14.500 4M20 19v-4h-4',
  check: 'M5 12.5l4.5 4.500L19 7.500',
  chev: 'M9 6l6 6-6 6',
  chevd: 'M6 9l6 6 6-6',
  pencil: 'M16 4l4 4L8 20H4v-4z',
  logout: 'M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 16l4-4-4-4M20 12H9',
  spark: 'M12 3l1.8 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 16l.7 1.800L21.500 18.500l-1.800.7L19 21l-.7-1.800-1.800-.7 1.800-.7z',
  x: 'M6 6l12 12M18 6 6 18',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  megaphone: 'M3 10v4a1 1 0 0 0 1 1h2.500L12 19V5L6.500 9H4a1 1 0 0 0-1 1zM15.500 9a4 4 0 0 1 0 6M18.500 6a8 8 0 0 1 0 12',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  table: 'M3 5h18v14H3zM3 10h18M9 10v9',
  g: 'M21 12.200c0-.7-.1-1.300-.2-1.900H12v3.600h5a4.300 4.300 0 0 1-1.900 2.800v2.300h3A9 9 0 0 0 21 12.200zM12 21a8.900 8.900 0 0 0 6.100-2.200l-3-2.300a5.600 5.600 0 0 1-8.400-2.900h-3v2.400A9 9 0 0 0 12 21zM6.700 13.600a5.400 5.400 0 0 1 0-3.400V7.800h-3a9 9 0 0 0 0 8.200zM12 6.600a4.900 4.900 0 0 1 3.400 1.300l2.600-2.600A8.700 8.700 0 0 0 12 3a9 9 0 0 0-8.300 4.800l3 2.400A5.400 5.400 0 0 1 12 6.600z',
  fb: 'M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.500a.5.5 0 0 1 .5-.5z'
};
IC.drop = 'M12 3s6.5 6.8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.8 12 3 12 3z';
IC.camera = 'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z';
IC.undo = 'M9 14 4 9l5-5M4 9h10.500a5.500 5.500 0 0 1 0 11H11';
IC.star = 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z';
IC.chart = 'M4 20V10M10 20V4M16 20v-7M22 20H2';
IC.ban = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8';
IC.alert = 'M12 4 2.5 20h19zM12 10v4.500M12 17.500h.01';
IC.edit = 'M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4';
IC.store = 'M4 9l1.500-5h13L20 9M4 9v11h16V9M4 9a2.700 2.700 0 0 0 5.300 0 2.700 2.700 0 0 0 5.400 0A2.700 2.700 0 0 0 20 9M10 20v-5h4v5';
const V = {};
const isStaff = u => !!u && (u.role === 'admin' || u.role === 'superadmin');
const ico = (n, s = 18, f = false) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${IC[n]}"/></svg>`;
const icoFill = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${IC[n]}"/></svg>`;


/* ---------- Brand: Flowing Water A (logo) + loader ---------- */
/* One geometry, two palettes: default for light surfaces, o.light for dark / gradient surfaces. */
const LOGO_LEGS = 'M11 54 32 9l21 45';
const LOGO_WATER = 'M18.900 37c4.300-5.500 8.600-5.500 13.100 0s8.800 5.500 13.100 0L53 54H11z';
const LOGO_WAVE = 'M17.500 47c4.500-4.500 9-4.500 14.500 0s10 4.500 14.500 0';
const LOGO_CROSS = 'M18.900 37c4.300-5.500 8.600-5.500 13.100 0s8.800 5.500 13.100 0';
let LID = 0;
const logo = (s = 22, o = {}) => {
  const i = 'lg' + (++LID), L = !!o.light;
  return `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${i}a" gradientUnits="userSpaceOnUse" x1="10" y1="54" x2="50" y2="8"><stop offset="0" stop-color="${L ? '#BAE6FD' : '#38BDF8'}"/><stop offset="1" stop-color="${L ? '#FFFFFF' : '#2196F3'}"/></linearGradient>
<linearGradient id="${i}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L ? '#7DD3FC' : '#2196F3'}"/><stop offset="1" stop-color="${L ? '#38BDF8' : '#102A43'}"/></linearGradient></defs>
<path d="${LOGO_WATER}" fill="url(#${i}w)"/><path d="${LOGO_LEGS}" fill="none" stroke="url(#${i}a)" stroke-width="7.500" stroke-linecap="round" stroke-linejoin="round"/><path d="${LOGO_WAVE}" fill="none" stroke="${L ? '#FFFFFF' : '#38BDF8'}" stroke-width="3.200" stroke-linecap="round"/></svg>`;
};
/* Loader: water rises and flows through the strokes of the A, with ripples behind it. Pure CSS animation. */
const FLOW = 'M-32 4q8-6 16 0t16 0 16 0 16 0 16 0 16 0 16 0 16 0V90H-32z';
const loader = (o = {}) => {
  const i = 'ql' + (++LID), text = o.text || 'Finding Your Water...';
  return `<div class="aql${o.inline ? ' inline' : ''}" role="status" aria-live="polite"><div class="aql-mark" aria-hidden="true"><i class="aql-rip"></i><i class="aql-rip r2"></i>
<svg viewBox="0 0 64 64" focusable="false"><defs><mask id="${i}m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><path d="${LOGO_LEGS}" stroke-width="7.500"/><path d="${LOGO_CROSS}" stroke-width="5.500"/><path d="${LOGO_WAVE}" stroke-width="3.200"/></g></mask>
<linearGradient id="${i}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2196F3"/><stop offset="1" stop-color="#102A43"/></linearGradient></defs>
<g class="aql-ghost" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${LOGO_LEGS}" stroke-width="7.500"/><path d="${LOGO_CROSS}" stroke-width="5.500"/><path d="${LOGO_WAVE}" stroke-width="3.200"/></g>
<g mask="url(#${i}m)"><g class="aql-rise"><g class="aql-flow b"><path d="${FLOW}" fill="#38BDF8"/></g><g class="aql-flow f"><path d="${FLOW}" fill="url(#${i}g)" transform="translate(0 3)"/></g></g></g></svg></div><p class="aql-t">${esc(text)}</p></div>`;
};

/* ---------- Status system: a tank gauge whose shape encodes the state ---------- */
const SM = {
  available: { label: 'Available', cls: 'available' },
  low: { label: 'Low supply', cls: 'low' },
  out: { label: 'Out of water', cls: 'out' },
  closed: { label: 'Closed', cls: 'closed' }
};
const SKEYS = Object.keys(SM);
const gauge = (k, s = 16) => {
  const body = {
    available: '<rect x="4" y="3" width="8" height="11" rx="1" fill="currentColor"/>',
    low: '<rect x="4" y="8.500" width="8" height="5.500" fill="currentColor"/>',
    out: '<path d="M3 14 13 2" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/>',
    closed: '<path d="M5.500 8.500h5" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/>'
  }[k];
  return `<svg class="gauge g-${k}" width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><rect x="3.200" y="2.200" width="9.600" height="12" rx="1.400" stroke="currentColor" stroke-width="1.300"/>${body}</svg>`;
};
const chip = s => `<span class="st st-${s.status}" data-sid="${s.id}">${gauge(s.status, 15)}<span>${SM[s.status].label}</span></span>`;

/* ---------- Data + state ---------- */
const ST = [];
const LOCS = [
  { n: 'Washington (Downtown), Surigao City', lat: 9.7860, lng: 125.4880 },
  { n: 'Taft', lat: 9.7905, lng: 125.4950 },
  { n: 'Lipata', lat: 9.7650, lng: 125.5045 },
  { n: 'Canlanipa', lat: 9.7760, lng: 125.4710 }
];
const LIVE_IDX = 4;
const S = {
  user: null, loc: 0, q: '', f: 'all', dist: 0, sort: 'dist',
  saved: [], notifs: [], nf: 'all', feed: null, mineIssues: null, repTab: 'recent',
  alerts: true, nearby: true, mode: 'car', chat: [], sel: null, sheet: 'peek',
  ad: { history: [], wr: [], people: [], ann: [], loaded: false }, reports: [], rf: 'open', as: null, ready: false,
  rv: {}, myRevs: null,
  sa: { loaded: false, loading: false, an: null, users: [], reports: [], reviews: [], avail: null, hours: 24, uq: '', ur: 'all', rs: 'pending', vs: 'flagged' }
};
const get = id => ST.find(s => s.id === id);
const LC = () => LOCS[S.loc] || LOCS[0];
const DIST = [0, 1, 2, 5];
const DIST_LABEL = ['Any distance', 'Within 1 km', 'Within 2 km', 'Within 5 km'];

const km = (s, a = LC()) => { const r = x => x * Math.PI / 180, dl = r(s.lat - a.lat), dn = r(s.lng - a.lng), h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(s.lat)) * Math.sin(dn / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const dm = s => { const k = km(s); return k < 1 ? Math.max(10, Math.round(k * 100) * 10) + ' m' : k.toFixed(1) + ' km'; };
const ago = t => { const m = Math.round((Date.now() - t) / M); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago'; };
const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dateTime = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const fh = h => `${h % 12 || 12}:00 ${h < 12 || h == 24 ? 'AM' : 'PM'}`;
const hrs = s => s.o == 0 && s.c == 24 ? 'Open 24 hours' : `${fh(s.o)} – ${fh(s.c)}`;
const isOpen = s => { const h = new Date().getHours(); return s.status !== 'closed' && h >= s.o && h < s.c; };
const byDist = l => [...l].sort((a, b) => km(a) - km(b));
const isSv = id => S.saved.includes(id);
const initials = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/* ---------- Avatars: initials always render underneath; the photo (if any) sits on top and is dropped if it fails to load ---------- */
const avUrl = f => f ? API + '/avatars/' + encodeURIComponent(f) : '';
const avatar = (u, size = 40, cls = '') => `<span class="av ${cls}" style="--av:${size}px" aria-hidden="true">${esc(initials(u.name || '?'))}${u.avatar ? `<img class="av-img" src="${esc(avUrl(u.avatar))}" alt="" decoding="async">` : ''}</span>`;
document.addEventListener('error', e => { if (e.target && e.target.classList && e.target.classList.contains('av-img')) e.target.remove(); }, true);

/* Profile photo pipeline. The browser decodes the chosen file, the person frames it (zoom + drag), and a 320px square JPEG is uploaded.
   Keeping the upload small means no extra libraries and fast loads everywhere the avatar appears. */
const PHOTO = { types: ['image/jpeg', 'image/png', 'image/webp'], maxIn: 15 * 1024 * 1024, out: 320, maxOut: 480 * 1024 };
function loadPhoto(file) {
  return new Promise((res, rej) => {
    if (!file) return rej(new Error('Choose a photo first.'));
    if (!PHOTO.types.includes(file.type)) return rej(new Error('Use a JPG, PNG or WebP image.'));
    if (file.size > PHOTO.maxIn) return rej(new Error('That photo is over 15 MB. Choose a smaller one.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); img.naturalWidth && img.naturalHeight ? res(img) : rej(new Error('That image could not be read.')); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That image could not be read. Try a different photo.')); };
    img.src = url;
  });
}
/* Draw img into a square canvas of `size` px. zoom >= 1 (1 = image just covers the square); ox/oy in -1..1 move the framed area. */
function paintPhoto(cv, img, zoom, ox, oy, size = cv.width) {
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d'), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const base = Math.max(size / iw, size / ih), sc = base * zoom, dw = iw * sc, dh = ih * sc;
  const x = (size - dw) / 2 + ox * Math.max(0, (dw - size) / 2), y = (size - dh) / 2 + oy * Math.max(0, (dh - size) / 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.drawImage(img, x, y, dw, dh);
}
function photoData(img, zoom, ox, oy) {
  const cv = document.createElement('canvas');
  paintPhoto(cv, img, zoom, ox, oy, PHOTO.out);
  for (const q of [0.88, 0.78, 0.66, 0.5]) { const d = cv.toDataURL('image/jpeg', q); if (d.length * 0.75 <= PHOTO.maxOut) return d; }
  throw new Error('That photo is still too large after resizing. Choose a simpler image.');
}

function filtered() {
  const q = S.q.trim().toLowerCase();
  const l = ST.filter(s => (!q || (s.name + ' ' + s.addr).toLowerCase().includes(q))
    && (S.f === 'all' || (S.f === 'open' ? isOpen(s) : s.status === S.f))
    && (!S.dist || km(s) <= DIST[S.dist]));
  if (S.sort === 'upd') return l.sort((a, b) => b.upd - a.upd);
  if (S.sort === 'name') return l.sort((a, b) => a.name.localeCompare(b.name));
  return byDist(l);
}

/* Notifications. Announcements reach everyone; saved-station updates follow the "saved" switch; others follow "nearby" (within 1 km). */
const nType = n => n.sid == null || n.kind === 'announcement' ? 'announcement' : n.kind === 'availability' ? 'availability' : n.kind === 'community' ? 'community' : 'info';
const nScope = n => nType(n) === 'announcement' && n.sid == null ? 'announcement' : isSv(n.sid) ? 'saved' : 'nearby';
const myN = () => S.notifs.filter(n => {
  if (n.sid == null) return true;
  if (isSv(n.sid)) return S.alerts;
  const s = get(n.sid); return S.nearby && s && km(s) <= 1;
}).sort((a, b) => b.t - a.t);
const unread = () => myN().filter(n => !n.read).length;

/* ---------- API ---------- */
let TOKEN = null; try { TOKEN = localStorage.getItem('aqf'); } catch { }
const API = (window.AQF_API_BASE || '').replace(/\/+$/, '') + '/api';
async function api(m, u, b) {
  let r;
  try { r = await fetch(API + u, { method: m, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) }, body: b ? JSON.stringify(b) : undefined }); }
  catch { if (window.PWA) PWA.netFail(); const e = new Error(navigator.onLine === false ? 'You are offline. Reconnect and try again.' : 'Cannot reach AquaFind right now. Check your connection and try again.'); e.offline = true; throw e; }
  if (window.PWA) PWA.netOk();
  let d = {}; try { d = await r.json(); } catch { }
  if (!r.ok) { const e = new Error(d.error || 'Something went wrong.'); e.status = r.status; throw e; }
  return d;
}
async function loadAll() {
  const [st, sv, nf] = await Promise.all([api('GET', '/stations'), api('GET', '/saved'), api('GET', '/notifications')]);
  const was = new Map(ST.map(s => [s.id, s.status])); S.flash = new Set(st.filter(s => was.has(s.id) && was.get(s.id) !== s.status).map(s => s.id));
  ST.length = 0; ST.push(...st); S.saved = sv; S.notifs = nf; S.alerts = S.user.alerts; S.nearby = S.user.nearby;
  S.reports = S.user.role === 'admin' ? await api('GET', '/reports') : [];   // station admins only; the system admin has its own lists
  if (window.PWA) PWA.markSynced();
}

/* ---------- Live location (watchPosition). LOCS[4] holds the latest fix ---------- */
const LIVE = { id: null, on: false, acc: 0, rl: null, warned: false };
const metres = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
function startLive() {
  if (!navigator.geolocation) return toast('Location is not available on this device.', 'error');
  if (LIVE.id !== null) return;
  toast('Finding your location…'); LIVE.warned = false;
  LIVE.id = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
function stopLive(quiet) {
  if (LIVE.id !== null) navigator.geolocation.clearWatch(LIVE.id);
  LIVE.id = null; LIVE.on = false; LIVE.acc = 0; MAPS.me = MAPS.mec = null;
  if (S.loc === LIVE_IDX) S.loc = 0; LOCS.length = Math.min(LOCS.length, LIVE_IDX);
  if (!quiet) { render(); toast('Live location off'); }
}
function onPos(p) {
  const c = p.coords, pt = [c.latitude, c.longitude], first = !LIVE.on; LIVE.acc = c.accuracy || 0;
  LOCS[LIVE_IDX] = { n: 'My location (live)', lat: pt[0], lng: pt[1] };
  if (first) { LIVE.on = true; S.loc = LIVE_IDX; LIVE.rl = pt; render(); toast('Live location on', 'ok'); return; }
  if (MAPS.me) { MAPS.me.setLatLng(pt); if (MAPS.mec) { MAPS.mec.setLatLng(pt); MAPS.mec.setRadius(LIVE.acc); } }
  if (S.loc !== LIVE_IDX || metres(LIVE.rl, pt) < 25) return;
  LIVE.rl = pt;
  const r = currentRoute().name;
  if (r === 'map') refreshMapList();
  else if (['home', 'stations', 'saved', 'reports', 'notifications'].includes(r) && !$('#modal') && !document.activeElement?.matches('input,textarea,select')) renderKeep();
}
function onPosErr(e) {
  if (e.code === 1) { stopLive(true); render(); return toast('Location permission was denied. Allow it in your browser settings.', 'error'); }
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(location.hostname)) { stopLive(true); render(); return toast('Live location needs HTTPS or localhost.', 'error'); }
  if (!LIVE.warned) { LIVE.warned = true; toast(e.code === 3 ? 'Still looking for a GPS signal…' : 'Your location is unavailable right now.'); }
}

/* ---------- Toasts, modal, dropdown ---------- */
const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const outThen = (el, ms, fn) => { el.classList.add('out'); if (REDUCED()) return fn(); let done = false; const f = () => { if (!done) { done = true; fn(); } }; el.addEventListener('animationend', f, { once: true }); setTimeout(f, ms + 60); };
function toast(t, kind = '') {
  const box = $('#toasts'); if (!box) return;
  const d = document.createElement('div'); d.className = 'toast ' + kind;
  d.innerHTML = ico(kind === 'ok' ? 'check' : kind === 'error' ? 'x' : 'bell', 16) + '<span></span>'; d.lastChild.textContent = t;
  box.append(d); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => d.isConnected && outThen(d, 200, () => d.remove()), 3200);
}
let lastFocus = null;
function modal(html, label) {
  closeModal(true, true); lastFocus = document.activeElement;
  const d = document.createElement('div'); d.className = 'scrim'; d.id = 'modal';
  d.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${html}</div>`;
  d.addEventListener('mousedown', e => { if (e.target === d) closeModal(); });
  $('#phone').append(d);
  (d.querySelector('[autofocus],input,select,textarea,button:not(.dlg-x)') || d.firstChild).focus();
}
function closeModal(keepFocus, instant) {
  if (MAPS.pick) { try { MAPS.pick.remove(); } catch { } MAPS.pick = null; }
  const m = $('#modal'); if (!m) return; m.removeAttribute('id');   // free the id immediately; the node fades out
  const fin = () => m.remove();
  if (instant) fin(); else outThen(m, 240, fin);
  if (!keepFocus && lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
/* skeleton placeholders (shimmer) */
const skRows = (n = 4) => `<div class="sk-wrap" aria-hidden="true">${Array.from({ length: n }, () => '<div class="sk-row"><span class="sk sk-av"></span><div class="sk-col"><span class="sk sk-line m"></span><span class="sk sk-line s"></span></div></div>').join('')}</div><span class="sr" role="status">Loading</span>`;
function trapFocus(e) {
  const m = $('#modal'); if (!m || e.key !== 'Tab') return;
  const f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', m).filter(x => x.offsetParent !== null);
  if (!f.length) return; const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}
