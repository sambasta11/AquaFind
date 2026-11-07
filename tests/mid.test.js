const ROOT = require('path').resolve(__dirname, '..');
const { JSDOM, VirtualConsole } = require('jsdom'); const { spawn } = require('child_process'); const fs = require('fs');
const PORT = 3778, URL0 = `http://localhost:${PORT}/`; fs.rmSync('/tmp/ui-db2', { recursive: true, force: true });
const srv = spawn('node', ['--no-warnings', ''+ROOT+'/backend/server.js'], { env: { ...process.env, PORT, DB_SCHEMA: 'test_ui2', DB_SCHEMA_RESET: '1', NODE_ENV: '' }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
(async () => {
  await sleep(1200); const tok = (await (await fetch(URL0 + 'api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@aquafind.com', password: 'user123' }) })).json()).token;
  let down = false; const vc = new VirtualConsole(); const errs = []; vc.on('jsdomError', e => errs.push(e.message));
  const dom = await JSDOM.fromURL(URL0, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
    w.matchMedia = q => ({ matches: false, addEventListener() { }, removeEventListener() { } }); w.scrollTo = () => { };
    w.fetch = (u, o) => down ? Promise.reject(new TypeError('x')) : fetch(new URL(u, URL0), o); w.localStorage.setItem('aqf', tok); } });
  const w = dom.window, d = w.document; await sleep(1500);
  ok(!!d.querySelector('.lead-h') && d.getElementById('netbar').hidden, 'online: app loaded, no offline banner');
  down = true; Object.defineProperty(w.navigator, 'onLine', { get: () => false, configurable: true }); w.dispatchEvent(new w.Event('offline')); await sleep(200);
  ok(!d.getElementById('netbar').hidden && /last updated at/.test(d.getElementById('netbar').textContent), 'connection lost: banner says when data was last updated -> "' + d.getElementById('netbar').textContent.slice(0, 70) + '…"');
  let msg = ''; try { await w.eval("api('POST','/saved/s2')"); } catch (e) { msg = e.message; } ok(/offline/i.test(msg), 'action while offline gives a clear message: ' + msg);
  down = false; Object.defineProperty(w.navigator, 'onLine', { get: () => true, configurable: true }); w.dispatchEvent(new w.Event('online')); await sleep(800);
  ok(d.getElementById('netbar').hidden && !d.documentElement.classList.contains('offline'), 'reconnected: banner clears and data refreshes');
  ok(w.localStorage.getItem('aqf') === tok, 'session token retained throughout'); ok(errs.length === 0, 'no script errors ' + errs.join('|'));
  console.log(`${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
