const ROOT = require('path').resolve(__dirname, '..');
const { JSDOM, VirtualConsole } = require('jsdom'); const { spawn } = require('child_process'); const fs = require('fs'), path = require('path');
const PORT = 3777, URL0 = `http://localhost:${PORT}/`;
fs.rmSync('/tmp/ui-db', { recursive: true, force: true });
const srv = spawn('node', ['--no-warnings', ROOT + '/backend/server.js'], { env: { ...process.env, PORT, DB_SCHEMA: 'test_ui', DB_SCHEMA_RESET: '1', NODE_ENV: '' }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
async function boot(opts = {}) {
  const errs = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(String(e.message).slice(0, 160)));
  const dom = await JSDOM.fromURL(URL0 + (opts.hash || ''), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
    w.matchMedia = q => ({ matches: false, media: q, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } });
    w.fetch = (u, o) => opts.offline ? Promise.reject(new TypeError('fail')) : fetch(new URL(u, URL0), o);
    w.scrollTo = () => { }; Object.defineProperty(w.navigator, 'onLine', { get: () => !opts.offline, configurable: true });
    if (opts.token) w.localStorage.setItem('aqf', opts.token);
    if (opts.ios) { Object.defineProperty(w.navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1' }); }
  } });
  await sleep(opts.wait || 1500); return { dom, w: dom.window, d: dom.window.document, errs };
}
const login = async (e, p) => (await (await fetch(URL0 + 'api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) })).json()).token;
(async () => {
  await sleep(1200);
  const ut = await login('user@aquafind.com', 'user123'), at = await login('admin@aquafind.com', 'admin123');
  console.log('A. signed-out launch'); let t = await boot();
  ok(/Sign in/i.test(t.d.querySelector('h1')?.textContent || ''), 'signed-out user lands on Sign in'); ok(!!t.d.querySelector('link[rel=manifest]'), 'manifest linked'); ok(t.errs.length === 0, 'no script errors ' + t.errs.join('|'));
  console.log('B. user session'); t = await boot({ token: ut });
  const tabs = [...t.d.querySelectorAll('.tabbar a')].map(a => a.textContent.trim()); ok(tabs.join(',') === 'Home,Explore,Community,Saved,Profile', 'bottom nav: ' + tabs.join(','));
  ok(t.d.querySelector('.tabbar a.on')?.textContent.trim() === 'Home', 'Home tab active'); ok(!!t.d.querySelector('.lead-h'), 'home shows nearest station'); ok(t.errs.length === 0, 'no script errors on Home ' + t.errs.join('|'));
  for (const [h, name, sel] of [['#/map', 'Explore', '#bigmap'], ['#/stations', 'Explore', '.page'], ['#/reports', 'Community', '.page'], ['#/saved', 'Saved', '.page'], ['#/account', 'Profile', '#profform'], ['#/ask', '', '#chatform'], ['#/notifications', '', '.page']]) {
    t.w.location.hash = h; await sleep(700); ok(!!t.d.querySelector(sel) && (t.d.querySelector('.tabbar a.on')?.textContent.trim() || '') === name, `${h} renders, "${name||"no"}" tab highlighted`);
  }
  ok(t.errs.length === 0, 'no script errors across screens ' + t.errs.join('|'));
  console.log('C. install UI'); 
  t.w.location.hash = '#/account'; await sleep(500); ok(/Install AquaFind|HTTPS|secure/i.test(t.d.body.textContent) && /<h2>App<\/h2>/.test(t.d.body.innerHTML), 'account shows App/install section'); 
  const ev = new t.w.Event('beforeinstallprompt'); ev.prompt = () => { }; ev.userChoice = Promise.resolve({ outcome: 'accepted' }); t.w.dispatchEvent(ev); await sleep(300);
  ok(t.w.PWA.state() === 'prompt', 'Android: install prompt captured'); ok(!!t.d.querySelector('[data-act=install]'), 'Android: "Install AquaFind" button rendered');
  ok(!t.d.querySelector('[data-act=ios-help]'), 'Android: no iOS instructions');
  t.d.querySelector('[data-act=install]').click(); await sleep(300); t.w.dispatchEvent(new t.w.Event('appinstalled')); await sleep(300); ok(t.w.PWA.state() === 'installed' && /installed on this device/.test(t.d.body.textContent), 'install success state shown');
  t = await boot({ token: ut, ios: true }); ok(t.w.PWA.state() === 'ios' && !!t.d.querySelector('[data-act=ios-help]') && !t.d.querySelector('[data-act=install]'), 'iOS: Share-menu help shown, no Android button');
  t.d.querySelector('[data-act=ios-help]').click(); await sleep(200); ok(/Add to Home Screen/.test(t.d.querySelector('#modal')?.textContent || ''), 'iOS: instructions dialog mentions Add to Home Screen');
  console.log('D. admin'); t = await boot({ token: at, hash: '' }); ok(t.w.location.hash.startsWith('#/admin') && !!t.d.querySelector('.is-admin'), 'admin lands in console'); 
  for (const sec of ['availability', 'issues', 'community', 'announcements', 'people']) { t.w.location.hash = '#/admin/' + sec; await sleep(600); ok(t.d.querySelector('.is-admin')?.textContent.length > 100, 'admin/' + sec + ' renders'); }
  ok(t.errs.length === 0, 'no script errors in admin ' + t.errs.join('|'));
  console.log('E. offline'); t = await boot({ token: ut, offline: true, wait: 1500 });
  ok(!!t.d.querySelector('.offscreen'), 'offline launch shows offline screen, not sign-in'); ok(t.w.localStorage.getItem('aqf') === ut, 'saved session kept (not signed out)');
  ok(t.d.documentElement.classList.contains('offline') && !t.d.getElementById('netbar').hidden, 'offline banner visible');
  ok(!/Available|Low supply/.test(t.d.body.textContent), 'no stale availability shown while offline');
  console.log(`\n${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
