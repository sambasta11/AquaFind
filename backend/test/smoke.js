// End-to-end API smoke test: DATABASE_URL=... node test/smoke.js
// Starts its own server inside a throwaway schema (smoke_xxxx) of the database in DATABASE_URL and drops it at the end,
// so real data in the public schema is never touched. Use a local Postgres or a separate Supabase test project.
const { spawn } = require('child_process'); const os = require('os'); const path = require('path'); const fs = require('fs');
const PORT = 3200 + Math.floor(Math.random() * 500), BASE = `http://localhost:${PORT}`;
const SCHEMA = 'smoke_' + Math.random().toString(36).slice(2, 10);
const srv = spawn('node', ['--no-warnings', path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT, DB_SCHEMA: SCHEMA, DB_SCHEMA_RESET: '1', ALLOWED_ORIGINS: 'https://localhost', NODE_ENV: '' }, stdio: 'pipe' });
const dropSchema = async () => { const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false } }); try { await c.connect(); await c.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`); } catch (e) { console.log('Could not drop test schema:', e.message); } finally { await c.end().catch(() => { }); } };
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('  FAIL:', m)); if (c) console.log('  ok  ', m); };
const call = async (m, u, b, t, h = {}) => { const r = await fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}), ...h }, body: b ? JSON.stringify(b) : undefined }); let d = null; try { d = await r.json(); } catch { } return { s: r.status, d, h: r.headers }; };
(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/healthz'); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const U = (await call('POST', '/api/auth/login', { email: 'user@aquafind.com', password: 'user123' })).d.token;
  const A = (await call('POST', '/api/auth/login', { email: 'admin@aquafind.com', password: 'admin123' })).d.token;
  ok(U && A, 'user and admin login');
  ok((await call('POST', '/api/auth/login', { email: 'user@aquafind.com', password: 'wrongpw' })).s === 401, 'wrong password rejected');
  ok((await call('GET', '/api/stations')).s === 401, 'API requires a token');
  const st = (await call('GET', '/api/stations', null, U)).d; ok(st.length === 8 && st.every(s => s.status && s.lat), 'stations load from the database (8)');
  const reg = await call('POST', '/api/auth/register', { name: 'Test Person', email: 't@x.com', password: 'secret1' }); ok(reg.s === 200 && reg.d.token, 'registration');
  ok((await call('POST', '/api/auth/register', { name: 'Test Person', email: 't@x.com', password: 'secret1' })).s === 409, 'duplicate email rejected');
  ok((await call('GET', '/api/me', null, reg.d.token)).d.email === 't@x.com', 'new user session works');
  await call('POST', '/api/saved/s2', null, U); ok((await call('GET', '/api/saved', null, U)).d.includes('s2'), 'save station');
  await call('DELETE', '/api/saved/s2', null, U); ok(!(await call('GET', '/api/saved', null, U)).d.includes('s2'), 'unsave station');
  const wr = await call('POST', '/api/water-reports', { station_id: 's3', has_water: true, note: 'ok' }, U); ok(wr.s === 200 && wr.d.yes >= 1, 'community water report');
  ok((await call('POST', '/api/water-reports', { station_id: 's3', has_water: false }, U)).s === 429, '10-minute report limit');
  ok((await call('POST', '/api/reports', { station_id: 's1', type: 'Wrong phone', note: 'x' }, U)).s === 200 && (await call('GET', '/api/reports/mine', null, U)).d.length >= 2, 'incorrect-info report + history');
  ok((await call('PUT', '/api/stations/s1/availability', { status: 'low' }, U)).s === 403, 'user cannot change availability');
  ok((await call('PUT', '/api/stations/s2/availability', { status: 'low' }, A)).s === 403, 'admin limited to own station');
  const av = await call('PUT', '/api/stations/s1/availability', { status: 'low' }, A); ok(av.s === 200 && av.d.status === 'low', 'admin sets availability');
  for (const p of ['reports', 'admin/history', 'admin/water-reports', 'admin/people', 'admin/announcements']) ok((await call('GET', '/api/' + p, null, A)).s === 200, 'admin ' + p);
  ok((await call('GET', '/api/admin/people', null, U)).s === 403, 'admin routes blocked for users');
  ok((await call('POST', '/api/admin/announcements', { title: 'Maintenance', body: 'Closed at noon' }, A)).s === 200, 'admin announcement');
  const nf = (await call('GET', '/api/notifications', null, U)).d; ok(nf.some(n => n.title === 'Maintenance'), 'announcement reaches users');
  await call('PUT', '/api/notifications/read-all', null, U); ok((await call('GET', '/api/notifications', null, U)).d.every(n => n.read), 'mark all read');
  ok((await call('GET', '/api/community', null, U)).d.some(x => x.mine), 'community feed');
  const ch = await call('POST', '/api/chat', { message: 'nearest station with water', lat: 9.786, lng: 125.488 }, U); ok(ch.s === 200 && ch.d.reply, 'AquaBot reply (built-in mode, no API key)');
  ok((await call('PUT', '/api/me', { name: 'Maria S', phone: '0917' }, U)).d.name === 'Maria S', 'profile update');
  ok((await call('PUT', '/api/me/password', { current: 'user123', next: 'user1234' }, U)).s === 200 && (await call('POST', '/api/auth/login', { email: 'user@aquafind.com', password: 'user1234' })).s === 200, 'password change');
  // profile picture
  const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  ok((await call('PUT', '/api/me/avatar', { image: PNG1 })).s === 401, 'avatar upload needs sign-in');
  const av1 = await call('PUT', '/api/me/avatar', { image: PNG1 }, U); ok(av1.s === 200 && /^\d+-[a-f0-9]{16}\.png$/.test(av1.d.avatar || ''), 'avatar upload stores a random file name');
  const avf = await fetch(BASE + '/api/avatars/' + av1.d.avatar); ok(avf.status === 200 && avf.headers.get('content-type') === 'image/png' && /immutable/.test(avf.headers.get('cache-control')), 'avatar file is served as an image, cacheable');
  ok((await call('GET', '/api/me', null, U)).d.avatar === av1.d.avatar, 'GET /api/me returns the avatar');
  ok((await call('PUT', '/api/me/avatar', { image: 'data:image/png;base64,' + Buffer.from('this is not an image at all').toString('base64') }, U)).s === 400, 'fake image (wrong file signature) rejected');
  ok((await call('PUT', '/api/me/avatar', { image: 'data:text/html;base64,PGI+aGk8L2I+' }, U)).s === 400, 'non-image type rejected');
  const big = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(600 * 1024)]).toString('base64');
  ok((await call('PUT', '/api/me/avatar', { image: big }, U)).s === 413, 'photo over 500 KB rejected');
  ok((await call('GET', '/api/me', null, U)).d.avatar === av1.d.avatar, 'failed uploads leave the current photo untouched');
  const av2 = await call('PUT', '/api/me/avatar', { image: PNG1 }, U); ok(av2.d.avatar !== av1.d.avatar, 'replacing the photo gives a new file name');
  await new Promise(r => setTimeout(r, 200)); ok((await fetch(BASE + '/api/avatars/' + av1.d.avatar)).status === 404, 'old photo is deleted after replacing');
  ok((await call('GET', '/api/avatars/..%2Fserver.js')).s === 404 && (await call('GET', '/api/avatars/x.png')).s === 404, 'avatar route rejects path tricks / unknown names');
  ok((await call('GET', '/api/me', null, reg.d.token)).d.avatar === null, "another user's photo is not touched");
  const rm = await call('DELETE', '/api/me/avatar', null, U); ok(rm.s === 200 && rm.d.avatar === null, 'remove photo');
  await new Promise(r => setTimeout(r, 200)); ok((await fetch(BASE + '/api/avatars/' + av2.d.avatar)).status === 404, 'removed photo is deleted');
  ok((await call('PUT', '/api/me', { phone: 'call me maybe' }, U)).s === 400, 'bad phone rejected');
  ok((await call('PUT', '/api/me', { name: 'x'.repeat(81) }, U)).s === 400, 'over-long name rejected');
  ok((await call('PUT', '/api/me', { email: 'admin@aquafind.com' }, U)).s === 409, "cannot take another account's email");
  // ---- v8: reviews, report workflow, superadmin console ----
  const SA = (await call('POST', '/api/auth/login', { email: 'super@aquafind.com', password: 'super123' })).d.token; ok(!!SA, 'superadmin login');
  ok((await call('GET', '/api/me', null, SA)).d.role === 'superadmin', 'superadmin role');
  for (const p of ['analytics', 'availability', 'users', 'reports', 'reviews']) { ok((await call('GET', '/api/superadmin/' + p, null, U)).s === 403 && (await call('GET', '/api/superadmin/' + p, null, A)).s === 403 && (await call('GET', '/api/superadmin/' + p, null, SA)).s === 200, 'superadmin/' + p + ' only for superadmin'); }
  // reviews
  ok((await call('PUT', '/api/stations/s2/reviews', { rating: 6 }, U)).s === 400 && (await call('PUT', '/api/stations/s2/reviews', { rating: 4.5 }, U)).s === 400, 'rating must be an integer 1-5');
  ok((await call('PUT', '/api/stations/nope/reviews', { rating: 5 }, U)).s === 404, 'review of unknown station rejected');
  ok((await call('PUT', '/api/stations/s2/reviews', { rating: 5, comment: 'x'.repeat(501) }, U)).s === 400, 'over-long review rejected');
  const r1 = await call('PUT', '/api/stations/s2/reviews', { rating: 4, comment: 'Clean water, friendly staff.' }, U); ok(r1.s === 200 && r1.d.station.rating === 4 && r1.d.station.rcount === 1, 'user posts a review; station rating updates');
  const r2 = await call('PUT', '/api/stations/s2/reviews', { rating: 2, comment: 'Changed my mind.' }, U); ok(r2.d.updated && r2.d.station.rcount === 1, 'second review by same user edits (one per user per station)');
  await call('PUT', '/api/stations/s2/reviews', { rating: 5, comment: 'Great!' }, reg.d.token);
  const rl = (await call('GET', '/api/stations/s2/reviews', null, U)).d; ok(rl.count === 2 && rl.avg === 3.5 && rl.items.some(x => x.mine) && rl.dist[4] === 1, 'review list: average, distribution, mine flag');
  ok(!rl.items.some(x => 'uid' in x || 'email' in x), 'review list exposes no user ids or emails');
  const rid = rl.items.find(x => !x.mine).id;
  ok((await call('POST', '/api/reviews/' + rid + '/flag', null, U)).s === 200, 'user flags another review');
  ok((await call('POST', '/api/reviews/' + rl.items.find(x => x.mine).id + '/flag', null, U)).s === 400, 'cannot flag own review');
  const sr = (await call('GET', '/api/superadmin/reviews', null, SA)).d; ok(sr[0].id === rid && sr[0].flags === 1, 'moderation list shows flagged reviews first');
  ok((await call('PUT', '/api/superadmin/reviews/' + rid, { status: 'hidden' }, U)).s === 403, 'user cannot moderate reviews');
  ok((await call('PUT', '/api/superadmin/reviews/' + rid, { status: 'hidden' }, SA)).s === 200 && (await call('GET', '/api/stations/s2/reviews', null, U)).d.count === 1, 'superadmin hides a review; it leaves the public rating');
  ok(!(await call('GET', '/api/stations/s2/reviews', null, U)).d.items.some(x => x.id === rid), 'hidden review is not shown to other users');
  ok((await call('GET', '/api/stations/s2/reviews', null, reg.d.token)).d.items.some(x => x.id === rid && x.status === 'hidden'), 'author still sees own hidden review with its status');
  ok((await call('DELETE', '/api/superadmin/reviews/' + rid, null, SA)).s === 200, 'superadmin deletes a review');
  ok((await call('DELETE', '/api/stations/s2/reviews', null, U)).s === 200 && (await call('GET', '/api/reviews/mine', null, U)).d.length === 0, 'author deletes own review');
  // report workflow
  const myR = (await call('GET', '/api/reports/mine', null, U)).d[0]; ok(myR.status === 'pending', 'new report starts as pending');
  ok((await call('PUT', '/api/reports/' + myR.id + '/status', { status: 'approved' }, U)).s === 403, 'user cannot change report status');
  ok((await call('PUT', '/api/reports/' + myR.id + '/status', { status: 'bogus' }, SA)).s === 400, 'invalid report status rejected');
  ok((await call('PUT', '/api/reports/' + myR.id + '/status', { status: 'approved', note: 'We will fix the hours.' }, SA)).s === 200 && (await call('GET', '/api/reports/mine', null, U)).d.find(x => x.id === myR.id).adminNote === 'We will fix the hours.', 'superadmin approves; reporter sees status and note');
  const otherR = (await call('GET', '/api/superadmin/reports', null, SA)).d.find(x => x.sid !== 's1'); if (otherR) ok((await call('PUT', '/api/reports/' + otherR.id + '/status', { status: 'rejected' }, A)).s === 403, 'station admin cannot touch another station\'s report');
  ok((await call('PUT', '/api/reports/' + myR.id + '/status', { status: 'resolved' }, A)).s === 200 && (await call('GET', '/api/reports', null, A)).d.find(x => x.id === myR.id).done === true, 'station admin resolves own station report (legacy flag kept)');
  ok((await call('PUT', '/api/reports/' + myR.id + '/status', { status: 'rejected' }, SA)).s === 200 && (await call('GET', '/api/reports', null, A)).d.find(x => x.id === myR.id).done === false, 'status can be changed again; resolved flag follows');
  // station management
  const ns = { name: 'New Spring', addr: 'Test St', tel: '0917 000 0000', o: 6, c: 18, lat: 9.78, lng: 125.49, status: 'low' };
  ok((await call('POST', '/api/stations', ns, A)).s === 403 && (await call('POST', '/api/stations', ns, U)).s === 403, 'only superadmin adds stations');
  ok((await call('POST', '/api/stations', { ...ns, c: 5 }, SA)).s === 400 && (await call('POST', '/api/stations', { ...ns, lat: 200 }, SA)).s === 400 && (await call('POST', '/api/stations', { ...ns, name: '' }, SA)).s === 400, 'station validation (hours, coordinates, name)');
  const made = await call('POST', '/api/stations', ns, SA); ok(made.s === 201 && made.d.id === 's9' && made.d.status === 'low', 'superadmin adds a station with an initial status');
  ok((await call('GET', '/api/stations', null, U)).d.length === 9, 'new station is visible to users');
  const ed = await call('PUT', '/api/stations/s9', { ...ns, name: 'New Spring 2', lat: 9.79, lng: 125.5 }, SA); ok(ed.s === 200 && ed.d.name === 'New Spring 2' && ed.d.lat === 9.79, 'superadmin edits any station incl. position');
  ok((await call('PUT', '/api/stations/s9', { ...ns, lat: 1, lng: 1 }, A)).s === 403, 'station admin cannot edit other stations');
  ok((await call('PUT', '/api/stations/s2', { name: 'PureFlow Water Hub', addr: 'Borromeo St, Taft, Surigao City', tel: '0922 555 0182', o: 0, c: 24, lat: 5, lng: 5 }, SA)).s === 200 && (await call('GET', '/api/stations', null, U)).d.find(x => x.id === 's2').lat === 5, 'superadmin moves station s2');
  await call('PUT', '/api/stations/s2', { name: 'PureFlow Water Hub', addr: 'Borromeo St, Taft, Surigao City', tel: '0922 555 0182', o: 0, c: 24, lat: 9.7915, lng: 125.4965 }, SA);
  ok((await call('PUT', '/api/stations/s9/availability', { status: 'out' }, SA)).d.status === 'out', 'superadmin updates availability of any station');
  await call('POST', '/api/saved/s9', null, U); await call('PUT', '/api/stations/s9/reviews', { rating: 3 }, U); await call('POST', '/api/reports', { station_id: 's9', type: 'x' }, U);
  ok((await call('DELETE', '/api/stations/s9', null, A)).s === 403, 'station admin cannot delete stations');
  ok((await call('DELETE', '/api/stations/s9', null, SA)).s === 200 && (await call('GET', '/api/stations', null, U)).d.length === 8 && !(await call('GET', '/api/saved', null, U)).d.includes('s9'), 'delete removes the station and its saved/review/report rows');
  ok((await call('DELETE', '/api/stations/s9', null, SA)).s === 404, 'deleting a missing station is a 404');
  // analytics + monitoring
  const an = (await call('GET', '/api/superadmin/analytics', null, SA)).d; ok(an.stations.total === 8 && an.stations.available + an.stations.low + an.stations.out + an.stations.closed === 8 && an.users.total >= 4 && typeof an.reports.pending === 'number', 'analytics totals add up');
  const mo = (await call('GET', '/api/superadmin/availability?hours=1', null, SA)).d; ok(mo.items.length === 8 && mo.items.some(x => x.stale) && mo.items.some(x => !x.stale), 'availability monitor flags outdated stations');
  // user management
  const users = (await call('GET', '/api/superadmin/users', null, SA)).d; ok(users.length >= 4 && users.every(u => !('password_hash' in u)), 'user list (no password hashes)');
  const tid = users.find(u => u.email === 't@x.com').id, sid = users.find(u => u.role === 'superadmin').id;
  ok((await call('PUT', '/api/superadmin/users/' + tid, { active: false }, U)).s === 403, 'user cannot manage users');
  ok((await call('PUT', '/api/superadmin/users/' + sid, { active: false }, SA)).s === 400 && (await call('PUT', '/api/superadmin/users/' + sid, { role: 'user' }, SA)).s === 400, 'superadmin cannot deactivate or demote themselves');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { role: 'admin' }, SA)).s === 400, 'admin role needs a station');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { role: 'admin', station: 's3' }, SA)).s === 200 && (await call('GET', '/api/me', null, reg.d.token)).d.station === 's3', 'assign a station-admin role');
  ok((await call('PUT', '/api/stations/s3/availability', { status: 'low' }, reg.d.token)).s === 200 && (await call('PUT', '/api/stations/s1/availability', { status: 'low' }, reg.d.token)).s === 403, 'new station admin is limited to their station');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { role: 'wizard' }, SA)).s === 400, 'unknown role rejected');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { role: 'user' }, SA)).s === 200 && (await call('PUT', '/api/stations/s3/availability', { status: 'available' }, reg.d.token)).s === 403, 'demotion takes effect immediately');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { active: false }, SA)).s === 200 && (await call('GET', '/api/me', null, reg.d.token)).s === 401, 'deactivated user\'s existing session stops working');
  ok((await call('POST', '/api/auth/login', { email: 't@x.com', password: 'secret1' })).s === 403, 'deactivated user cannot sign in');
  ok((await call('PUT', '/api/superadmin/users/' + tid, { active: true }, SA)).s === 200 && (await call('POST', '/api/auth/login', { email: 't@x.com', password: 'secret1' })).s === 200, 'reactivated user can sign in again');
  ok((await call('GET', '/api/admin/people', null, SA)).s === 403, 'station-scoped admin routes stay closed to superadmin without a station');
  // production/PWA plumbing
  const pre = await fetch(BASE + '/api/stations', { method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'GET' } }); ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === 'https://localhost', 'CORS allows a listed origin');
  const bad = await fetch(BASE + '/api/stations', { headers: { Origin: 'https://evil.com' } }); ok(!bad.headers.get('access-control-allow-origin'), 'CORS blocks other origins');
  ok((await fetch(BASE + '/manifest.webmanifest')).headers.get('content-type').includes('manifest+json'), 'manifest MIME type');
  ok((await fetch(BASE + '/sw.js')).headers.get('cache-control') === 'no-cache', 'service worker is never cached by the HTTP cache');
  const mj = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }); ok(mj.status === 400 && (await mj.json()).error, 'malformed JSON returns a clean 400');
  console.log(`\n${pass} passed, ${fail} failed`); srv.kill(); await dropSchema(); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); srv.kill(); await dropSchema(); process.exit(1); });
