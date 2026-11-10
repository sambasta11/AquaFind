/* AquaFind core: helpers, icons, status system, state, API layer, live location. Loaded first. */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = 60000;

/* ---------- Icons (1.6px stroke, 24px grid) ---------- */
const IC = {
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14',
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
  g: 'M21 12.200c0-.7-.1-1.300-.2-1.900H12v3.600h5a4.300 4.300 0 0 1-1.900 2.800v2.300h3A9 9 0 0 0 21 12.200zM12 21a8.900 8.900 0 0 0 6.100-2.200l-3-2.300a5.600 5.600 0 0 1-8.400-2.900h-3v2.400A9 9 0 0 0 12 21zM6.700 13.600a5.400 5.400 0 0 1 0-3.400V7.800h-3a9 9 0 0 0 0 8.200zM12 6.600a4.900 4.900 0 0 1 3.400 1.300l2.600-2.600A8.700 8.700 0 0 0 12 3a9 9 0 0 0-8.300 4.800l3 2.400A5.400 5.400 0 0 1 12 6.600z'
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


/* ---------- Brand: wave "A" (logo) + loader ---------- */
/* One traced geometry in a 64-unit box, two palettes: default for light surfaces, o.light for dark surfaces. */
const LOGO_A = 'M28.08 12.95 C28.01 13.01 27.63 13.63 26.69 15.24 C26.51 15.54 26.33 15.83 26.28 15.91 C26.23 15.98 26.02 16.34 25.81 16.71 C25.6 17.07 25.19 17.76 24.91 18.25 C24.31 19.26 23.84 20.06 22.86 21.78 C22.48 22.45 21.94 23.39 21.66 23.85 C21.22 24.62 20.75 25.43 20.12 26.54 C20 26.76 19.73 27.22 19.52 27.57 C19.17 28.18 18.83 28.75 18.13 29.97 C17.96 30.26 17.73 30.65 17.62 30.84 C17.52 31.03 17.2 31.59 16.92 32.09 C16.19 33.36 16.19 33.37 17.41 33.24 C18.43 33.14 22.6 33.12 23.6 33.22 C25.34 33.39 26.67 33.62 28.31 34.01 C29.48 34.29 29.69 34.31 29.69 34.16 C29.69 33.89 27.5 32.86 25.7 32.28 C24.66 31.94 24.66 31.94 24.89 31.55 C24.98 31.41 25.38 30.72 25.78 30.02 C26.19 29.32 26.72 28.4 26.97 27.97 C27.22 27.55 27.53 27.02 27.65 26.79 C27.99 26.19 28.14 25.95 28.2 25.95 C28.27 25.95 28.36 26.1 29.4 27.92 C29.88 28.78 30.4 29.68 30.54 29.91 C30.68 30.15 30.91 30.55 31.04 30.82 C31.18 31.08 31.38 31.43 31.47 31.59 C33.32 34.73 33.43 36.09 31.88 36.42 C31.17 36.57 30.45 36.48 28.67 36.01 C21.75 34.17 11.74 34.92 4.47 37.8 C2.28 38.67 1.85 38.9 2.04 39.09 C2.11 39.16 2.71 39.1 4.13 38.87 C4.74 38.77 6 38.63 7.52 38.5 C10.19 38.26 14.15 38.33 16.72 38.66 C19.1 38.95 23.2 39.93 25.86 40.83 C26.71 41.11 27.11 41.26 28.15 41.67 C28.71 41.9 30.1 42.56 30.64 42.85 C31.82 43.51 32.92 44.1 33.25 44.25 C37.58 46.24 41.06 47.05 45.39 47.06 C48.42 47.07 50.59 46.76 53.98 45.86 C56.88 45.09 62.56 42.55 61.93 42.31 C61.84 42.27 61.85 42.27 60.99 42.48 C55.05 43.92 50.13 43.4 46.4 40.91 C46.02 40.66 45.64 40.39 45.55 40.31 C45.47 40.23 45.3 40.1 45.18 40.01 C44.38 39.43 42.95 37.83 42.12 36.58 C41.69 35.93 41.45 35.53 40.65 34.11 C40.44 33.76 40.14 33.23 39.97 32.94 C39.8 32.65 39.57 32.26 39.47 32.07 C39.36 31.87 38.9 31.07 38.45 30.28 C37.37 28.41 37.49 28.62 36.84 27.47 C36.52 26.91 36.15 26.27 36.01 26.03 C35.87 25.8 35.67 25.44 35.55 25.24 C35.34 24.87 35.03 24.34 34.47 23.38 C34.32 23.11 34.02 22.6 33.81 22.23 C33.59 21.87 33.32 21.39 33.19 21.17 C33.05 20.95 32.74 20.41 32.48 19.97 C32.22 19.53 31.6 18.48 31.1 17.64 C30.59 16.79 30.01 15.8 29.79 15.43 C28.4 13.02 28.25 12.81 28.08 12.95 z';
const LOGO_WAVE = 'M12.63 40.95 C10.52 41.03 7.59 41.45 5.64 41.93 C4.03 42.33 3.88 42.63 5.35 42.53 C9.63 42.23 16.32 43.58 21.04 45.69 C21.19 45.76 21.63 45.96 22.01 46.12 C22.39 46.29 23.31 46.74 24.05 47.12 C26.86 48.55 27.55 48.9 28.14 49.15 C32.97 51.19 38.21 51.66 43.74 50.55 C45.56 50.19 48.12 49.39 48.42 49.09 C48.65 48.86 48.46 48.84 47.22 48.94 C45.83 49.06 43.71 48.97 41.46 48.7 C39.58 48.48 36.61 47.78 34.79 47.13 C34.6 47.07 34.25 46.95 34.02 46.87 C33.19 46.58 31.14 45.74 30.59 45.45 C30.49 45.4 30.1 45.2 29.71 45.02 C29.34 44.83 28.81 44.55 28.54 44.41 C23.83 41.79 18.77 40.69 12.63 40.95 z';
const LOGO_STOPS = {
  dark: [['#4CDDF0', '#21C3DB', '#0F6C88'], ['#9BEAF6', '#31C9DE', '#17798F']],
  light: [['#F2FDFF', '#A9F1FE', '#4FC6EC'], ['#FFFFFF', '#C6F5FF', '#7BD7F2']]
};
let LID = 0;
const logo = (s = 22, o = {}) => {
  const i = 'lg' + (++LID), p = LOGO_STOPS[o.light ? 'light' : 'dark'];
  const stops = (cs, os) => cs.map((c, n) => `<stop offset="${os[n]}" stop-color="${c}"/>`).join('');
  return `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs>
<linearGradient id="${i}a" x1="0" y1="0" x2=".55" y2="1">${stops(p[0], ['0', '.45', '1'])}</linearGradient>
<linearGradient id="${i}b" x1="0" y1="0" x2="1" y2=".45">${stops(p[1], ['0', '.5', '1'])}</linearGradient></defs>
<path d="${LOGO_A}" fill="url(#${i}a)"/><path d="${LOGO_WAVE}" fill="url(#${i}b)"/></svg>`;
};
/* Loader: water rises and fills the mark, with ripples behind it. Pure CSS animation. */
const FLOW = 'M-32 4q8-6 16 0t16 0 16 0 16 0 16 0 16 0 16 0 16 0V90H-32z';
const loader = (o = {}) => {
  const i = 'ql' + (++LID), text = o.text || 'Finding Your Water...';
  return `<div class="aql${o.inline ? ' inline' : ''}" role="status" aria-live="polite"><div class="aql-mark" aria-hidden="true"><i class="aql-rip"></i><i class="aql-rip r2"></i>
<svg viewBox="0 0 64 64" focusable="false"><defs><g id="${i}p"><path d="${LOGO_A}"/><path d="${LOGO_WAVE}"/></g><mask id="${i}m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><use href="#${i}p" fill="#fff"/></mask>
<linearGradient id="${i}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#21C3DB"/><stop offset="1" stop-color="#0F6C88"/></linearGradient></defs>
<g class="aql-ghost"><use href="#${i}p"/></g>
<g mask="url(#${i}m)"><g class="aql-rise"><g class="aql-flow b"><path d="${FLOW}" fill="#4CDDF0"/></g><g class="aql-flow f"><path d="${FLOW}" fill="url(#${i}g)" transform="translate(0 3)"/></g></g></g></svg></div><p class="aql-t">${esc(text)}</p></div>`;
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
const hrs = s => s.o == null || s.c == null ? 'Hours not listed' : s.o == 0 && s.c == 24 ? 'Open 24 hours' : `${fh(s.o)} – ${fh(s.c)}`;
const isOpen = s => { const h = new Date().getHours(); return s.o != null && s.c != null && s.status !== 'closed' && h >= s.o && h < s.c; };   // unknown hours are never shown as open
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
const REDUCED = () => false; // animations always on, regardless of OS reduce-motion setting
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
