// Google/Facebook sign-in UI test (jsdom). Real AquaFind server + mock Supabase Auth + a stand-in for supabase-js
// (a browser test cannot visit google.com). Covers: click -> signInWithOAuth args, double-click guard, return with ?code=,
// cancel / deny (?error=access_denied), missing config, refresh keeps the session, logout, protected pages.
const ROOT = require('path').resolve(__dirname, '..');
const { JSDOM, VirtualConsole } = require('jsdom'); const { spawn } = require('child_process'); const http = require('http');
const PORT = 3810, MOCK = 3811, URL0 = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms)); let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ok  ' : '  FAIL', m); };
const U = { 'g-token-aaaaaaaaaaaaaaaaaaaaa': { id: 'ui-g', email: 'ui.g@gmail.com', user_metadata: { full_name: 'Una Google' }, identities: [{ provider: 'google', last_sign_in_at: new Date().toISOString(), identity_data: { email_verified: true } }] } };
const mock = http.createServer((q, r) => { const j = (s, o) => { r.writeHead(s, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (q.url === '/auth/v1/settings') return j(200, { external: { google: true, facebook: true } });
  if (q.url === '/auth/v1/user') { const u = U[(q.headers.authorization || '').replace('Bearer ', '')]; return u ? j(200, u) : j(401, {}); } r.writeHead(404); r.end(); }).listen(MOCK);
const start = env => spawn('node', ['--no-warnings', ROOT + '/backend/server.js'], { env: { ...process.env, DB_SCHEMA: 'test_oauth_ui', DB_SCHEMA_RESET: '1', NODE_ENV: '', ...env }, stdio: 'ignore' });
let srv = start({ PORT, SUPABASE_URL: `http://127.0.0.1:${MOCK}`, SUPABASE_ANON_KEY: 'anon' });
async function boot(search = '', opts = {}) {
  const errs = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errs.push(String(e.message).slice(0, 200)));
  const calls = { oauth: [], exchange: [], signOut: 0 }; let sub = null;
  const dom = await JSDOM.fromURL(URL0 + search, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
    w.matchMedia = () => ({ matches: false, addEventListener() { }, removeEventListener() { } }); w.scrollTo = () => { }; w.fetch = (u, o) => fetch(new URL(u, URL0), o);
    if (opts.token) w.localStorage.setItem('aqf', opts.token);
    if (opts.store) Object.entries(opts.store).forEach(([k, v]) => w.localStorage.setItem(k, v));
    w.supabase = { createClient: (url, key, o) => { calls.client = { url, key, o }; return { auth: {
      signInWithOAuth: async a => { calls.oauth.push(a); await sleep(150); return opts.oauthError ? { error: new Error(opts.oauthError) } : { data: {}, error: null }; },
      onAuthStateChange: cb => { sub = cb; return { data: { subscription: {} } }; },
      exchangeCodeForSession: async code => { calls.exchange.push(code); if (opts.badCode) return { error: new Error('invalid flow state') }; sub && sub('SIGNED_IN', { access_token: 'g-token-aaaaaaaaaaaaaaaaaaaaa' }); return { data: {}, error: null }; },
      signOut: async () => { calls.signOut++; } } }; } };
  } });
  await sleep(1500); return { w: dom.window, d: dom.window.document, errs, calls };
}
const click = (t, sel) => t.d.querySelector(sel).dispatchEvent(new t.w.MouseEvent('click', { bubbles: true }));
(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(URL0 + 'healthz'); break; } catch { await sleep(150); } }
  // 1. sign-in screen
  let t = await boot(); const btns = [...t.d.querySelectorAll('.soc .soc-btn')];
  ok(btns.length === 1 && /Google/.test(btns[0].textContent) && !/Facebook/.test(t.d.body.textContent) && btns.every(b => b.querySelector('svg')), 'sign-in shows only the Google button, with its brand icon');
  ok(!/demo sign-in|simulated/i.test(t.d.body.textContent), 'no "demo sign-in" wording left');
  // 2. click Google twice quickly
  click(t, '[data-p=google]'); click(t, '[data-p=google]'); await sleep(40);
  ok([...t.d.querySelectorAll('.soc .soc-btn')].every(b => b.disabled) && t.d.querySelector('[data-p=google] .spinner'), 'buttons disabled + spinner while the request starts');
  await sleep(400);
  ok(t.calls.oauth.length === 1 && t.calls.oauth[0].provider === 'google', 'repeated clicks start only ONE Google sign-in');
  ok(t.calls.oauth[0].options.redirectTo === URL0 && t.calls.oauth[0].options.queryParams.prompt === 'select_account', 'redirects back to AquaFind and asks Google to show the account chooser');
  ok(t.calls.client.url === `http://127.0.0.1:${MOCK}` && t.calls.client.key === 'anon' && t.calls.client.o.auth.flowType === 'pkce', 'client built from server config, PKCE flow');
  // 4. start fails
  t = await boot('', { oauthError: 'provider is not enabled' }); click(t, '[data-p=google]'); await sleep(500);
  ok(/provider is not enabled/.test(t.d.getElementById('socmsg').textContent) && [...t.d.querySelectorAll('.soc .soc-btn')].every(b => !b.disabled), 'start error is shown and the buttons come back');
  // 5. return from Google: success
  t = await boot('?code=abc123'); 
  ok(t.calls.exchange[0] === 'abc123', 'callback exchanges the ?code for a session');
  ok(t.w.eval('S.user && S.user.email') === 'ui.g@gmail.com' && t.w.eval('S.user.name') === 'Una Google', 'signed in to AquaFind with the Google profile (name + email)');
  ok(t.w.location.search === '' && /^#\/?$/.test(t.w.location.hash || '#/'), 'code removed from the address bar; landed on Home');
  ok(t.d.querySelector('.menu-h') && /Una Google/.test(t.d.body.textContent), 'app shell shows the Google user');
  ok(t.calls.signOut === 1 && !Object.keys(t.w.localStorage).some(k => k.startsWith('sb-')), 'temporary Supabase session is dropped after sign-in');
  const tok = t.w.localStorage.getItem('aqf'); ok(!!tok, 'AquaFind session token stored');
  t.w.location.hash = '#/account'; await sleep(600);
  ok(/You sign in with Google/.test(t.d.body.textContent) && !t.d.getElementById('pwform'), 'profile page: no password form for a Google-only account');
  // 6. refresh keeps session; logout; protected page
  const t2 = await boot('', { token: tok }); ok(t2.w.eval('S.user && S.user.email') === 'ui.g@gmail.com', 'session persists after a page refresh');
  t2.w.eval("document.querySelector('[data-act=logout]').click()"); await sleep(500);
  ok(t2.w.eval('S.user') === null && t2.w.localStorage.getItem('aqf') === null && /signin/.test(t2.w.location.hash), 'logout clears the session and returns to sign-in');
  t2.w.location.hash = '#/saved'; await sleep(500); ok(/signin/.test(t2.w.location.hash), 'protected page redirects to sign-in when signed out');
  // 7. cancel / deny
  t = await boot('?error=access_denied&error_code=bad_oauth_callback&error_description=User+denied+access', { store: {} });
  ok(/cancelled or permission was not granted/.test(t.d.getElementById('socmsg')?.textContent || '') && t.w.eval('S.user') === null, 'user cancels / denies: friendly message, not signed in');
  ok(t.w.location.search === '', 'error params removed from the address bar'); ok([...t.d.querySelectorAll('.soc .soc-btn')].every(b => !b.disabled), 'buttons usable again after a cancel');
  t = await boot('?code=zzz', { badCode: true }); ok(/could not be completed/.test(t.d.getElementById('socmsg')?.textContent || '') && t.w.eval('S.user') === null, 'bad / expired code: clear error, not signed in');
  t = await boot('#error=server_error&error_description=Unable+to+exchange+external+code'); ok(/Unable to exchange external code/.test(t.d.getElementById('socmsg')?.textContent || ''), 'provider error reported in the hash is shown too');
  ok(t.errs.length === 0, 'no script errors');
  // 8. server without OAuth config
  srv.kill(); await sleep(500); srv = start({ PORT, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' });
  for (let i = 0; i < 40; i++) { try { await fetch(URL0 + 'healthz'); break; } catch { await sleep(150); } }
  t = await boot(); click(t, '[data-p=google]'); await sleep(500);
  ok(/not set up yet/.test(t.d.getElementById('socmsg').textContent) && t.calls.oauth.length === 0, 'missing OAuth configuration: clear message, nothing sent to a provider');
  console.log(`\n${pass} passed, ${fail} failed`); srv.kill(); mock.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); mock.close(); process.exit(1); });
