/* AquaFind service worker.
   - /api/* is NEVER cached or intercepted: availability is always live, never stale.
   - HTML/CSS/JS: network first, cache fallback (updates arrive immediately when online).
   - Fonts, icons, Leaflet, artwork: cache first (they rarely change).
   Bump VERSION when you change the SHELL list. */
const VERSION = 'aquafind-v20';
const SHELL = [
  '/', '/index.html', '/offline.html', '/offline.js', '/styles.css', '/config.js', '/manifest.webmanifest',
  '/js/core.js', '/js/oauth.js', '/js/maps.js', '/js/views.js', '/js/admin.js', '/js/superadmin.js', '/js/main.js', '/js/pwa.js',
  '/fonts/manrope-latin-wght-normal.woff2', '/fonts/inter-latin-wght-normal.woff2',
  '/vendor/supabase/supabase.js', '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/images/marker-icon.png', '/vendor/leaflet/images/marker-icon-2x.png',
  '/vendor/leaflet/images/marker-shadow.png', '/vendor/leaflet/images/layers.png', '/vendor/leaflet/images/layers-2x.png',
  '/img/contours.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png', '/icons/favicon-32.png', '/icons/logo.svg'
];
const STATIC_FIRST = /\.(woff2|png|svg|ico)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/downloads/')) return; // browser handles it
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put('/index.html', r.clone())); return r; })
      .catch(async () => (await caches.match('/index.html')) || (await caches.match('/offline.html'))));
    return;
  }
  if (STATIC_FIRST.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })));
    return;
  }
  e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; })
    .catch(async () => (await caches.match(req)) || Response.error()));
});
