// Google/Facebook sign-in backend test: DATABASE_URL=... node test/oauth.js
// Runs the real server against a MOCK Supabase Auth (it plays Supabase's /auth/v1/user and /auth/v1/settings),
// so it proves AquaFind's side (token verification, account create/return, no e-mail merging, photo import, guards).
// It does NOT prove Google/Facebook/Supabase dashboard configuration: that needs a real browser sign-in (see DEPLOY.md).
const http = require('http'); const { spawn } = require('child_process'); const path = require('path');
const PORT = 3700 + Math.floor(Math.random() * 200), MOCK = PORT + 300, BASE = `http://localhost:${PORT}`;
const SCHEMA = 'oauth_' + Math.random().toString(36).slice(2, 10);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const now = new Date().toISOString();
const USERS = {   // access token -> what Supabase would answer for it
  'g-new-token-aaaaaaaaaaaaaaaa': { id: 'sb-g-1', email: 'Gina.G@Gmail.com', user_metadata: { full_name: 'Gina Google' }, identities: [{ provider: 'google', last_sign_in_at: now, identity_data: { email_verified: true, name: 'Gina Google' } }] },
  'f-new-token-aaaaaaaaaaaaaaaa': { id: 'sb-f-1', email: 'fred@fb.com', user_metadata: { name: 'Fred Facebook' }, identities: [{ provider: 'facebook', last_sign_in_at: now, identity_data: { email_verified: true } }] },
  'clash-token-aaaaaaaaaaaaaaaaa': { id: 'sb-g-2', email: 'user@aquafind.com', user_metadata: { full_name: 'Not Maria' }, identities: [{ provider: 'google', last_sign_in_at: now, identity_data: { email_verified: true } }] },
  'noemail-token-aaaaaaaaaaaaaaa': { id: 'sb-f-2', email: '', user_metadata: { name: 'Phone Only' }, identities: [{ provider: 'facebook', last_sign_in_at: now, identity_data: {} }] },
  'unverified-token-aaaaaaaaaaaa': { id: 'sb-f-3', email: 'unv@fb.com', user_metadata: { name: 'Unverified' }, identities: [{ provider: 'facebook', last_sign_in_at: now, identity_data: { email_verified: false } }] },
  'emailonly-token-aaaaaaaaaaaaa': { id: 'sb-e-1', email: 'pw@x.com', user_metadata: {}, identities: [{ provider: 'email', last_sign_in_at: now, identity_data: {} }] },
  'pic-token-aaaaaaaaaaaaaaaaaaa': { id: 'sb-g-3', email: 'pic@gmail.com', user_metadata: { full_name: 'Pic Person', avatar_url: `http://127.0.0.1:${MOCK}/photo.png` }, identities: [{ provider: 'google', last_sign_in_at: now, identity_data: { email_verified: true } }] }
};
const mock = http.createServer((req, res) => {
  const j = (s, o) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/auth/v1/settings') return j(200, { external: { google: true, facebook: false } });
  if (req.url === '/auth/v1/user') {
    if (req.headers.apikey !== 'anon-test-key') return j(401, { msg: 'bad key' });
    const u = USERS[(req.headers.authorization || '').replace('Bearer ', '')]; return u ? j(200, u) : j(401, { msg: 'invalid JWT' });
  }
  res.writeHead(404); res.end();
}).listen(MOCK);
const env = { ...process.env, PORT, DB_SCHEMA: SCHEMA, DB_SCHEMA_RESET: '1', NODE_ENV: '', SUPABASE_URL: `http://127.0.0.1:${MOCK}`, SUPABASE_ANON_KEY: 'anon-test-key' };
const srv = spawn('node', ['--no-warnings', path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
const dropSchema = async () => { const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false } }); await c.connect(); await c.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`); await c.end(); };
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); if (c) console.log('  ok  ', m); };
const call = async (m, u, b, t) => { const r = await fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let d = {}; try { d = await r.json(); } catch { } return { s: r.status, d, h: r.headers }; };
const oauth = t => call('POST', '/api/auth/oauth', { access_token: t });
(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const cfg = await call('GET', '/api/auth/config'); ok(cfg.s === 200 && cfg.d.enabled && cfg.d.anonKey === 'anon-test-key' && cfg.d.providers.google === true && cfg.d.providers.facebook === false, 'config endpoint reports Supabase + which providers are switched on');
  ok(!JSON.stringify(cfg.d).includes('service'), 'config exposes only the public anon key');
  ok((await call('GET', '/api/auth/social')).s === 404 && (await call('POST', '/api/auth/social', { provider: 'Google' })).s === 404, 'the old simulated /api/auth/social route is gone');
  ok((await fetch(BASE + '/')).headers.get('content-security-policy').includes(`connect-src 'self' https://routing.openstreetmap.de http://127.0.0.1:${MOCK}`), 'CSP allows the browser to reach Supabase');
  // first-time Google login
  const g1 = await oauth('g-new-token-aaaaaaaaaaaaaaaa'); ok(g1.s === 200 && g1.d.token && g1.d.user.email === 'gina.g@gmail.com' && g1.d.user.name === 'Gina Google' && g1.d.user.role === 'user' && g1.d.user.pw === false, 'first Google login creates the account (name + lower-cased email, no password)');
  ok((await call('GET', '/api/stations', null, g1.d.token)).d.length === 8 && (await call('GET', '/api/me', null, g1.d.token)).d.email === 'gina.g@gmail.com', 'Google user has a working session with the same features as e-mail users');
  const g2 = await oauth('g-new-token-aaaaaaaaaaaaaaaa'); ok(g2.s === 200 && g2.d.user.id === g1.d.user.id, 'returning Google login signs in to the SAME account (no duplicate)');
  const users = (await call('POST', '/api/auth/login', { email: 'super@aquafind.com', password: 'super123' })); const SA = users.d.token;
  const list = (await call('GET', '/api/superadmin/users', null, SA)).d; ok(list.filter(u => u.email === 'gina.g@gmail.com').length === 1, 'exactly one user row after two Google logins');
  const par = await Promise.all([oauth('f-new-token-aaaaaaaaaaaaaaaa'), oauth('f-new-token-aaaaaaaaaaaaaaaa'), oauth('f-new-token-aaaaaaaaaaaaaaaa')]);
  ok(par.every(r => r.s === 200) && new Set(par.map(r => r.d.user.id)).size === 1, 'first-time Facebook login, fired 3x at once, still makes ONE account');
  ok((await call('GET', '/api/superadmin/users', null, SA)).d.filter(u => u.email === 'fred@fb.com').length === 1, 'no duplicate rows after the race');
  const f2 = await oauth('f-new-token-aaaaaaaaaaaaaaaa'); ok(f2.s === 200 && f2.d.user.id === par[0].d.user.id && f2.d.user.name === 'Fred Facebook', 'returning Facebook login');
  // account linking / safety
  const clash = await oauth('clash-token-aaaaaaaaaaaaaaaaa'); ok(clash.s === 409 && /already exists/.test(clash.d.error) && !clash.d.token, 'Google e-mail that matches a password account is NOT merged');
  ok((await call('POST', '/api/auth/login', { email: 'user@aquafind.com', password: 'user123' })).d.user.name === 'Maria Santos', 'the existing password account is untouched');
  const ne = await oauth('noemail-token-aaaaaaaaaaaaaaa'); ok(ne.s === 400 && /email/i.test(ne.d.error), 'provider that shares no e-mail gives a clear message');
  ok((await oauth('unverified-token-aaaaaaaaaaaa')).s === 403, 'unverified provider e-mail is refused');
  ok((await oauth('emailonly-token-aaaaaaaaaaaaa')).s === 403, 'a Supabase e-mail/password identity cannot use the social endpoint');
  ok((await oauth('forged-token-aaaaaaaaaaaaaaaaaa')).s === 401, 'invalid / forged Supabase token rejected');
  ok((await call('POST', '/api/auth/oauth', {})).s === 400 && (await call('POST', '/api/auth/oauth', { access_token: 123 })).s === 400, 'missing or non-string token rejected');
  // passwordless accounts
  ok((await call('POST', '/api/auth/login', { email: 'gina.g@gmail.com', password: 'anything1' })).s === 401, 'password login for a Google-only account is refused (and does not crash)');
  ok((await call('PUT', '/api/me/password', { current: 'x', next: 'newpass1' }, g1.d.token)).s === 400, 'password change is refused for a Google-only account');
  ok((await call('PUT', '/api/me', { name: 'Gina G.', phone: '0917' }, g1.d.token)).d.name === 'Gina G.' && (await oauth('g-new-token-aaaaaaaaaaaaaaaa')).d.user.name === 'Gina G.', 'profile edits survive the next Google login');
  // deactivated
  const gid = g1.d.user.id; await call('PUT', '/api/superadmin/users/' + gid, { active: false }, SA);
  ok((await oauth('g-new-token-aaaaaaaaaaaaaaaa')).s === 403 && (await call('GET', '/api/me', null, g1.d.token)).s === 401, 'deactivated Google account cannot sign in');
  // profile photo import
  const photo = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'image/png' }); r.end(PNG); }).listen(0);   // 127.0.0.1 is not an allowed photo host: must be ignored
  const pic = await oauth('pic-token-aaaaaaaaaaaaaaaaaaa'); ok(pic.s === 200 && pic.d.user.avatar === null, 'photo from a non-Google/Facebook host is not imported (SSRF guard), sign-in still works');
  photo.close();
  // server without Supabase config
  const srv2 = spawn('node', ['--no-warnings', path.join(__dirname, '..', 'server.js')], { env: { ...env, PORT: PORT + 600, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${PORT + 600}/healthz`); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const c2 = await (await fetch(`http://localhost:${PORT + 600}/api/auth/config`)).json(); const o2 = await fetch(`http://localhost:${PORT + 600}/api/auth/oauth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: 'g-new-token-aaaaaaaaaaaaaaaa' }) });
  ok(c2.enabled === false && o2.status === 503, 'missing OAuth configuration: config says disabled, endpoint answers 503 with a clear message'); srv2.kill();
  const srv3 = spawn('node', ['--no-warnings', path.join(__dirname, '..', 'server.js')], { env: { ...env, PORT: PORT + 601, SUPABASE_ANON_KEY: 'sb_secret_abcdef' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${PORT + 601}/healthz`); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  ok((await (await fetch(`http://localhost:${PORT + 601}/api/auth/config`)).json()).enabled === false, 'a secret / service-role key in SUPABASE_ANON_KEY is refused, never sent to the browser'); srv3.kill();
  console.log(`\n${pass} passed, ${fail} failed`); srv.kill(); mock.close(); await dropSchema(); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); srv.kill(); mock.close(); await dropSchema(); process.exit(1); });
