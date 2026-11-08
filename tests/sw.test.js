const ROOT = require('path').resolve(__dirname, '..');
const vm = require('vm'), fs = require('fs');
const code = fs.readFileSync(''+ROOT+'/frontend/sw.js', 'utf8');
const store = {}; let online = true; const log = []; const handlers = {};
const mkCache = n => ({ put: async (k, r) => { (store[n] ||= {})[typeof k === 'string' ? k : k.url.replace('http://x', '')] = r; }, addAll: async reqs => { for (const r of reqs) (store[n] ||= {})[r.url.replace('http://x', '')] = { ok: true, body: 'cached:' + r.url }; } });
const caches = { open: async n => mkCache(n), keys: async () => Object.keys(store), delete: async k => { delete store[k]; log.push('deleted ' + k); },
  match: async k => { const key = typeof k === 'string' ? k : k.url.replace('http://x', ''); for (const n in store) if (store[n][key]) return store[n][key]; } };
class Req { constructor(u, o = {}) { this.url = u.startsWith('http') ? u : 'http://x' + u; this.method = o.method || 'GET'; this.mode = o.mode || 'cors'; } }
const sandbox = { self: { addEventListener: (t, f) => handlers[t] = f, location: { origin: 'http://x' }, clients: { claim: async () => log.push('claimed') }, skipWaiting: () => log.push('skipWaiting') }, caches, Request: Req, URL, location: { origin: 'http://x' },
  fetch: async r => { if (!online) throw new TypeError('offline'); return { ok: true, body: 'net:' + r.url, clone() { return this; } }; }, Response: { error: () => 'ERR' } };
vm.createContext(sandbox); vm.runInContext(code, sandbox);
const fire = async (t, ev) => { let p; ev.waitUntil = x => p = x; ev.respondWith = x => p = x; ev.__rw = false; await handlers[t](ev); return p ? await p : undefined; };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
(async () => {
  store['aquafind-v1'] = { '/old': 1 };
  await fire('install', {}); ok(Object.keys(store['aquafind-v9']).length === 32, 'install precaches all 32 shell files');
  await fire('activate', {}); ok(!store['aquafind-v1'] && log.includes('claimed'), 'activate deletes old caches and claims clients');
  let called = false; handlers.fetch({ request: new Req('/api/stations'), respondWith: () => called = true }); ok(!called, '/api/* is never intercepted (no cached availability)');
  called = false; handlers.fetch({ request: new Req('/api/chat', { method: 'POST' }), respondWith: () => called = true }); ok(!called, 'POST requests are not intercepted');
  called = false; handlers.fetch({ request: new Req('https://tile.openstreetmap.org/1/1/1.png'), respondWith: () => called = true }); ok(!called, 'cross-origin map tiles are left to the browser');
  let r = await fire('fetch', { request: new Req('/', { mode: 'navigate' }) }); ok(r.body.startsWith('net:'), 'online navigation uses the network');
  online = false;
  r = await fire('fetch', { request: new Req('/', { mode: 'navigate' }) }); ok(r.body === 'net:http://x/', 'offline navigation serves the last good cached app shell');
  r = await fire('fetch', { request: new Req('/js/main.js') }); ok(r.body === 'cached:http://x/js/main.js', 'offline JS served from cache');
  r = await fire('fetch', { request: new Req('/icons/icon-192.png') }); ok(r.body === 'cached:http://x/icons/icon-192.png', 'icons are cache-first');
  online = true; r = await fire('fetch', { request: new Req('/js/main.js') }); ok(r.body.startsWith('net:'), 'online JS is network-first (updates arrive immediately)');
  await fire('message', { data: 'SKIP_WAITING' }).catch(() => { }); handlers.message({ data: 'SKIP_WAITING' }); ok(log.includes('skipWaiting'), 'SKIP_WAITING message activates the new worker');
  console.log(`${pass} passed, ${fail} failed`);
})();
