// AquaFind backend: Express + Supabase (PostgreSQL) + JWT auth
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const { pool, run, all, get, tx, applySchema } = require('./db');   // exits with a clear message if DATABASE_URL is missing

const PORT = process.env.PORT || 3000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PROD = process.env.NODE_ENV === 'production';

// Breached-password check (Have I Been Pwned range API, k-anonymity: only the first 5 chars of the SHA-1 leave the server).
// On in production, off elsewhere (set PWNED_CHECK=1/0 to override). Fails open if the service is unreachable.
const PWNED_ON = process.env.PWNED_CHECK ? process.env.PWNED_CHECK === '1' : PROD;
const COMMON_PW = new Set(['password', 'password1', '123456', '1234567', '12345678', '123456789', 'qwerty', 'qwerty123', 'abc123', 'iloveyou', 'admin123', 'user123', 'letmein', 'welcome1', 'aquafind', 'aquafind123']);
async function isWeakPassword(pw) {
  if (COMMON_PW.has(pw.toLowerCase())) return true;
  if (!PWNED_ON) return false;
  try {
    const h = crypto.createHash('sha1').update(pw).digest('hex').toUpperCase(), pre = h.slice(0, 5), suf = h.slice(5);
    const r = await fetch('https://api.pwnedpasswords.com/range/' + pre, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) return false;
    return (await r.text()).split('\n').some(l => { const [s2, n] = l.trim().split(':'); return s2 === suf && Number(n) > 0; });
  } catch { return false; }
}
const WEAK_MSG = 'That password has appeared in a known data breach. Please choose a different one.';
const CORS_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim().replace(/\/+$/, '')).filter(Boolean);
const DEV_SECRET = 'aquafind-dev-secret-change-me';
const SECRET = process.env.JWT_SECRET || DEV_SECRET;
if (PROD && (SECRET === DEV_SECRET || SECRET.length < 24)) { console.error('Refusing to start: set JWT_SECRET (at least 24 random characters) when NODE_ENV=production.'); process.exit(1); }

// Google sign-in goes through Supabase Auth. The browser talks to Supabase to sign in; this server then verifies the
// resulting Supabase session and issues AquaFind's own session token, so every other route keeps working unchanged.
// SUPABASE_ANON_KEY is the public "anon" / "publishable" key (safe in the browser). The service-role / secret key must NEVER be set here.
const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SB_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
let SB_ORIGIN = '';
try { if (SB_URL) SB_ORIGIN = new URL(SB_URL).origin; } catch { console.error('SUPABASE_URL is not a valid URL; Google sign-in is disabled.'); }
const keyRole = k => { try { return JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString()).role; } catch { return ''; } };
if (SB_KEY && (SB_KEY.startsWith('sb_secret_') || keyRole(SB_KEY) === 'service_role')) {
  console.error('SUPABASE_ANON_KEY holds a secret / service-role key. Refusing to expose it: use the public anon (publishable) key. Google sign-in is disabled.');
  SB_ORIGIN = '';
}
const SB_ON = !!(SB_ORIGIN && SB_KEY);

// ---------- Sample data (first run only) ----------
const SURIGAO = [
    ['s1','BlueDrop Refilling Station','Rizal St, Washington, Surigao City',9.787,125.489,'0917 123 4567',6,20,'available',5],
    ['s2','PureFlow Water Hub','Borromeo St, Taft, Surigao City',9.7915,125.4965,'0922 555 0182',0,24,'low',25],
    ['s3','AquaPlus Luna','Luna St, Luna, Surigao City',9.7805,125.4835,'0933 210 7788',7,19,'available',12],
    ['s4','Crystal Clear Lipata','Lipata Port Rd, Lipata, Surigao City',9.764,125.506,'0945 876 3321',6,21,'out',40],
    ['s5','H2O Express Sabang','Sabang Rd, Sabang, Surigao City',9.756,125.468,'0917 888 4410',0,24,'available',3],
    ['s6','Spring Haven Mapawa','Mapawa Rd, Mapawa, Surigao City',9.773,125.4955,'0906 345 1209',8,17,'closed',120],
    ['s7','ClearWave Canlanipa','Canlanipa Rd, Canlanipa, Surigao City',9.777,125.47,'0955 667 2034',6,19,'low',18],
    ['s8','Hydro Point Alang-alang','Alang-alang Rd, Alang-alang, Surigao City',9.789,125.506,'0918 402 9915',7,20,'available',9],
];
const addNotif = (sid, title, body, kind = 'update') =>
  run('INSERT INTO notifications (station_id,title,body,created_at,kind) VALUES (?,?,?,?,?)', sid, title, body, Date.now(), kind);

// ---------- Real water stations in Surigao City (one-time migration) ----------
// Name + coordinates are the Google Maps pins supplied by the project owner. Street address, barangay, phone and hours were NOT
// verified, so they are left blank (hours = NULL) instead of being invented. Station admins can fill them in from the app.
const REAL_STATIONS = [
  ['Ozone Technical Supplies and Services', 9.7865712, 125.4910611],
  ['So Fine Water Station', 9.7902460, 125.4917420],
  ['Aqua Fresca', 9.7823080, 125.4946861],
  ['Golden Horizon Purified Water Station', 9.7860127, 125.4987676],
  ['VIVAPURE Purified Drinking Water Refilling Station', 9.7820600, 125.4851200],
  ['Water-Aide Water Refilling Station', 9.7876800, 125.4943900],
  ['Aquablue Water Refilling Station and Supplies', 9.757131, 125.513763],
  ['Fhrence Water Station', 9.7903288, 125.4823235],
  ['Watershed Gem Purified Water', 9.7910673, 125.4909948],
  ['WATER ICE Refilling Station', 9.7580224, 125.4869450],
  ['Katubig Water Refilling Station', 9.7852100, 125.4878400],
  ['Pour and Drink Water Refilling Station', 9.7825473, 125.4910625],
  ['Eli\u2019s Spring Water Refilling Station', 9.7901468, 125.4890929],
  ['Ella\u2019s Refilling Station', 9.7881004, 125.4874777]
];
const MIGRATION_KEY = 'real-surigao-stations-v1';
const migrationDone = async () => !!(await get('SELECT 1 AS x FROM app_migrations WHERE migration_key=?', MIGRATION_KEY));
async function migrateRealStations() {
  if (process.env.DB_SCHEMA) return;          // the automated tests keep their own sample data
  if (await migrationDone()) return;          // runs once, so a station deleted later never comes back
  const fakeName = Object.fromEntries(SURIGAO.map(x => [x[0], x[1]]));
  await tx(async q => {
    // the original made-up sample stations (only if they are still untouched)
    const fake = (await q('SELECT station_id, station_name FROM stations')).rows.filter(r => fakeName[r.station_id] === r.station_name).map(r => r.station_id);
    let n = (await q("SELECT MAX(CAST(SUBSTR(station_id, 2) AS INTEGER)) AS m FROM stations WHERE station_id ~ '^s[0-9]{1,9}$'")).rows[0].m || 0;
    const have = new Set((await q('SELECT station_name FROM stations')).rows.map(r => r.station_name.toLowerCase()));
    const added = [];
    for (const [name, lat, lng] of REAL_STATIONS) {
      if (have.has(name.toLowerCase())) continue;
      const id = 's' + (++n);
      await q('INSERT INTO stations (station_id,station_name,address,latitude,longitude,contact_number,open_hour,close_hour) VALUES (?,?,?,?,?,?,?,?)', id, name, 'Surigao City', lat, lng, '', null, null);
      await q('INSERT INTO availability (station_id,status,last_updated) VALUES (?,?,?)', id, 'available', Date.now());
      added.push(id);
    }
    if (fake.length && added.length) {
      // a station admin of a removed sample station keeps a working dashboard: they now manage the first real station
      const admins = (await q("SELECT user_id FROM users WHERE role='admin' AND station_id = ANY(?)", fake)).rows;
      for (const a of admins) await q('UPDATE users SET station_id=? WHERE user_id=?', added[0], a.user_id);
      for (const id of fake) {
        await q('DELETE FROM review_flags WHERE review_id IN (SELECT review_id FROM reviews WHERE station_id=?)', id);
        await q('DELETE FROM notification_reads WHERE notification_id IN (SELECT notification_id FROM notifications WHERE station_id=?)', id);
        for (const t of ['reviews', 'notifications', 'water_reports', 'reports', 'saved_stations', 'availability']) await q(`DELETE FROM ${t} WHERE station_id=?`, id);
        await q("UPDATE users SET role='user', station_id=NULL WHERE station_id=?", id);
        await q('DELETE FROM stations WHERE station_id=?', id);
      }
      // the made-up general advisory from the sample data
      await q("DELETE FROM notification_reads WHERE notification_id IN (SELECT notification_id FROM notifications WHERE station_id IS NULL AND title='Water interruption advisory')");
      await q("DELETE FROM notifications WHERE station_id IS NULL AND title='Water interruption advisory'");
    }
    await q('INSERT INTO app_migrations (migration_key, applied_at) VALUES (?,?) ON CONFLICT DO NOTHING', MIGRATION_KEY, Date.now());
    console.log(`Real stations: added ${added.length}, removed ${fake.length} sample station(s).`);
  });
}

async function initDatabase() {
  await applySchema();
  const now = Date.now(), M = 60000;
  if (!(await get('SELECT COUNT(*) AS c FROM stations')).c) {
    await tx(async q => {
      for (const s of SURIGAO) {
        await q('INSERT INTO stations (station_id,station_name,address,latitude,longitude,contact_number,open_hour,close_hour) VALUES (?,?,?,?,?,?,?,?)', ...s.slice(0, 8));
        await q('INSERT INTO availability (station_id,status,last_updated) VALUES (?,?,?)', s[0], s[8], now - s[9] * M);
      }
      const insU = (name, email, hash, phone, role, sid) => q('INSERT INTO users (full_name,email,password_hash,phone,role,station_id,created_at) VALUES (?,?,?,?,?,?,?) RETURNING user_id', name, email, hash, phone, role, sid, now);
      let maria = null;
      if (!PROD) {
        maria = (await insU('Maria Santos', 'user@aquafind.com', bcrypt.hashSync('user123', 10), '0917 000 1111', 'user', null)).rows[0].user_id;
        await insU('Station Admin', 'admin@aquafind.com', bcrypt.hashSync('admin123', 10), '0917 123 4567', 'admin', 's1');
        for (const s of ['s1', 's4', 's5']) await q('INSERT INTO saved_stations (user_id,station_id) VALUES (?,?)', maria, s);
      } else if (process.env.ADMIN_EMAIL && (process.env.ADMIN_PASSWORD || '').length >= 10) {
        await insU('Station Admin', process.env.ADMIN_EMAIL.trim().toLowerCase(), bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10), '', 'admin', 's1');
        console.log('Created the station admin for s1 from ADMIN_EMAIL / ADMIN_PASSWORD.');
      } else console.warn('No admin created. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) before the first run to create the s1 station admin.');
      const insN = (sid, title, body, t) => q('INSERT INTO notifications (station_id,title,body,created_at) VALUES (?,?,?,?)', sid, title, body, t);
      await insN('s1', 'BlueDrop is available again', 'Water supply was restored.', now - 5 * M);
      await insN('s4', 'Crystal Clear is out of water', 'Refilling is paused until the next delivery.', now - 40 * M);
      await insN(null, 'Water interruption advisory', 'Expect low pressure in Washington and Lipata this afternoon.', now - 300 * M);
      if (!PROD) await q('INSERT INTO reports (station_id,user_id,type,note,created_at) VALUES (?,?,?,?,?)', 's1', maria, 'Wrong operating hours', 'Closes at 7 PM, not 8 PM.', now - 60 * M);
    });
    console.log('Database created with sample data.');
  }
  // Superadmin: from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (created, or an existing account is promoted); demo account only outside production.
  const em = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase(), pw = process.env.SUPERADMIN_PASSWORD || '';
  if (em && EMAIL_RE.test(em)) {
    const u = await get('SELECT user_id, role FROM users WHERE email=?', em);
    if (u && u.role !== 'superadmin') { await run("UPDATE users SET role='superadmin', station_id=NULL, active=1 WHERE user_id=?", u.user_id); console.log('Promoted ' + em + ' to superadmin.'); }
    else if (!u && pw.length >= 10) { await run("INSERT INTO users (full_name,email,password_hash,role,created_at) VALUES ('System Admin',?,?,'superadmin',?)", em, bcrypt.hashSync(pw, 10), Date.now()); console.log('Created superadmin ' + em + '.'); }
    else if (!u) console.warn('SUPERADMIN_PASSWORD must be 10+ characters to create the superadmin.');
  }
  const hasSuper = !!(await get("SELECT 1 AS x FROM users WHERE role='superadmin'"));
  if (!PROD && !hasSuper) await run("INSERT INTO users (full_name,email,password_hash,role,created_at) VALUES ('System Admin','super@aquafind.com',?,'superadmin',?)", bcrypt.hashSync('super123', 10), Date.now());
  if (PROD && !hasSuper) console.warn('No superadmin exists. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD (10+ chars) to enable the system admin console.');
  if (!PROD && (process.env.DB_SCHEMA || !(await migrationDone())) && !(await get('SELECT COUNT(*) AS c FROM water_reports')).c && (await get('SELECT COUNT(*) AS c FROM users')).c) {
    const uid = (await get('SELECT MIN(user_id) AS u FROM users')).u;
    const insW = (sid, has, note, t) => run('INSERT INTO water_reports (station_id,user_id,has_water,note,created_at) VALUES (?,?,?,?,?)', sid, uid, has, note, t);
    await insW('s1', 1, 'Water is flowing, short line.', now - 8 * M);
    await insW('s4', 0, 'Tank was empty when I arrived.', now - 35 * M);
    await insW('s2', 1, 'Slow, but still filling.', now - 50 * M);
  }
  await migrateRealStations();
}

// ---------- Helpers ----------
const STATUS = ['available', 'low', 'out', 'closed'];
const LABEL = { available: 'Available', low: 'Low Supply', out: 'Out of Water', closed: 'Closed' };
const EMAIL = /^\S+@\S+\.\S+$/;
const userOut = u => ({ id: u.user_id, name: u.full_name, email: u.email, phone: u.phone, role: u.role, station: u.station_id, alerts: !!u.alerts_on, nearby: !!u.nearby_on, avatar: u.avatar || null, pw: !!u.password_hash, since: u.created_at, active: u.active !== 0 });
const token = u => jwt.sign({ id: u.user_id }, SECRET, { expiresIn: '7d' });
const WR_WINDOW = 3 * 3600000; // community reports count for 3 hours
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);   // Express 4 does not catch rejected promises by itself
const intId = v => /^\d{1,9}$/.test(String(v)) ? +v : null;                              // numeric ids from URLs; anything else = no such row
const isDup = e => e && e.code === '23505';                                              // PostgreSQL unique violation
const stationRows = async () => withCommunity(await all(`
  SELECT s.station_id AS id, s.station_name AS name, s.address AS addr, s.latitude AS lat, s.longitude AS lng,
         s.contact_number AS tel, s.open_hour AS o, s.close_hour AS c, a.status AS status, a.last_updated AS upd,
         (SELECT ROUND(AVG(rating), 1) FROM reviews rv WHERE rv.station_id = s.station_id AND rv.status = 'visible') AS rating,
         (SELECT COUNT(*) FROM reviews rv WHERE rv.station_id = s.station_id AND rv.status = 'visible') AS rcount
  FROM stations s JOIN availability a ON a.availability_id =
    (SELECT MAX(availability_id) FROM availability WHERE station_id = s.station_id)`));
async function withCommunity(rows) {
  const q = await all(`SELECT station_id AS sid, SUM(has_water) AS "yes", SUM(1 - has_water) AS "no", MAX(created_at) AS "last"
    FROM water_reports WHERE created_at > ? GROUP BY station_id`, Date.now() - WR_WINDOW);
  const m = {}; q.forEach(r => m[r.sid] = r);
  return rows.map(r => ({ ...r, yes: m[r.id]?.yes || 0, no: m[r.id]?.no || 0, lastReport: m[r.id]?.last || null }));
}
const stationExists = async id => !!(await get('SELECT 1 AS x FROM stations WHERE station_id=?', id));
const oneStation = async id => (await stationRows()).find(s => s.id === id);
const userById = id => get('SELECT * FROM users WHERE user_id=?', id);

async function auth(req, res, next) {
  let id;
  try { id = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET).id; } catch { return res.status(401).json({ error: 'Please log in again.' }); }
  try {
    const user = Number.isInteger(id) ? await userById(id) : null;
    if (!user) return res.status(401).json({ error: 'Please log in again.' });
    if (user.active === 0) return res.status(401).json({ error: 'This account has been deactivated. Contact an administrator.' });
    req.user = user; next();
  } catch (e) { next(e); }   // a database problem is a 500, not "please log in again"
}
function stationAdmin(req, res, next) {
  if (req.user.role === 'superadmin') return next();
  if (req.user.role !== 'admin' || req.user.station_id !== req.params.id)
    return res.status(403).json({ error: 'Only the administrator of this station can do that.' });
  next();
}

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);

// HTTPS only in production behind a proxy (Render, Railway, Fly, nginx...): redirect plain HTTP, send HSTS
if (PROD && process.env.FORCE_HTTPS !== '0') app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https' || req.path === '/healthz') return next();
  res.redirect(308, 'https://' + req.headers.host + req.originalUrl);
});
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
    'Content-Security-Policy': ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
      "font-src 'self'", "connect-src 'self' https://routing.openstreetmap.de" + (SB_ORIGIN ? ' ' + SB_ORIGIN : ''), "manifest-src 'self'", "worker-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"].join('; ')
  });
  if (PROD) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

// CORS: only needed if the app is served from a different origin than this API (split hosting or the Capacitor Android app).
// ALLOWED_ORIGINS=https://app.example.com,https://localhost   (comma separated; same-origin needs nothing)
app.use('/api', (req, res, next) => {
  const o = req.headers.origin;
  if (o && CORS_ORIGINS.includes(o)) {
    res.set({ 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Max-Age': '86400' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  } else if (req.method === 'OPTIONS' && o) return res.sendStatus(403);
  next();
});
// Profile picture upload: sign-in is checked BEFORE the larger body is read; every other route keeps the 50 kb limit.
app.use('/api/me/avatar', auth, express.json({ limit: '700kb' }));
app.use(express.json({ limit: '50kb' }));

// Light brute-force guard on sign-in / sign-up (per IP, in memory)
const hits = new Map();
app.use('/api/auth', (req, res, next) => {
  const k = req.ip, now = Date.now(), h = (hits.get(k) || []).filter(t => now - t < 15 * 60000);
  if (h.length >= 40) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  h.push(now); hits.set(k, h); next();
});
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 15 * 60000)) hits.delete(k); }, 10 * 60000).unref();

app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  setHeaders(res, file) {
    const f = file.replace(/\\/g, '/');
    if (/\/(fonts|vendor|icons)\//.test(f)) res.set('Cache-Control', 'public, max-age=2592000');
    else res.set('Cache-Control', 'no-cache');                       // html, css, js, sw.js, manifest: always revalidate
    if (f.endsWith('/sw.js')) res.set('Service-Worker-Allowed', '/');
    if (f.endsWith('.webmanifest')) res.type('application/manifest+json');
  }
}));


// Authentication
app.post('/api/auth/register', ah(async (req, res) => {
  const { name = '', email = '', password = '' } = req.body;
  const e = email.trim().toLowerCase();
  if (name.trim().length < 2) return res.status(400).json({ error: 'Enter your full name.' });
  if (!EMAIL.test(e)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (await isWeakPassword(password)) return res.status(400).json({ error: WEAK_MSG });
  if (await get('SELECT 1 AS x FROM users WHERE email=?', e)) return res.status(409).json({ error: 'An account with this email already exists.' });
  let u;
  try { u = (await run('INSERT INTO users (full_name,email,password_hash,created_at) VALUES (?,?,?,?) RETURNING *', name.trim(), e, bcrypt.hashSync(password, 10), Date.now())).rows[0]; }
  catch (err) { if (isDup(err)) return res.status(409).json({ error: 'An account with this email already exists.' }); throw err; }
  res.json({ token: token(u), user: userOut(u) });
}));
app.post('/api/auth/login', ah(async (req, res) => {
  const e = (req.body.email || '').trim().toLowerCase(), p = req.body.password || '';
  if (!EMAIL.test(e)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (p.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const u = await get('SELECT * FROM users WHERE email=?', e);
  if (u && !u.password_hash) return res.status(401).json({ error: 'This account signs in with Google. Use that button instead.' });
  if (!u || !bcrypt.compareSync(p, u.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  if (u.active === 0) return res.status(403).json({ error: 'This account has been deactivated. Contact an administrator.' });
  res.json({ token: token(u), user: userOut(u) });
}));
// ---- Google sign-in (real OAuth through Supabase Auth) ----
// Which providers are switched on in the Supabase project (public endpoint, cached for a minute). null = could not find out.
let sbCache = { t: 0, v: null };
async function sbProviders() {
  if (sbCache.v && Date.now() - sbCache.t < 60000) return sbCache.v;
  try {
    const r = await fetch(SB_ORIGIN + '/auth/v1/settings', { headers: { apikey: SB_KEY }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('status ' + r.status);
    const d = await r.json(); sbCache = { t: Date.now(), v: { google: !!d.external?.google } };
  } catch (e) { console.error('Could not read Supabase Auth settings:', e.message); return sbCache.v; }
  return sbCache.v;
}
app.get('/api/auth/config', ah(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!SB_ON) return res.json({ enabled: false });
  res.json({ enabled: true, url: SB_ORIGIN, anonKey: SB_KEY, providers: await sbProviders() });
}));
const sbUser = async at => {   // the same check supabase.auth.getUser(token) does: Supabase itself validates the token
  const r = await fetch(SB_ORIGIN + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + at }, signal: AbortSignal.timeout(8000) });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error('Supabase Auth answered ' + r.status);
  return r.json();
};
// Copies the provider's profile picture into our own avatars table (best effort, https + known hosts only, same size and type checks as uploads).
const PHOTO_HOST = /(^|\.)googleusercontent\.com$/;
async function importPhoto(userId, url) {
  try {
    let u = new URL(url);
    for (let hop = 0; hop < 4; hop++) {
      if (u.protocol !== 'https:' || !PHOTO_HOST.test(u.hostname)) return;
      const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u); continue; }
      if (!r.ok) return;
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > AV_MAX) return;
      const ext = avType(buf); if (!ext) return;
      const file = `${userId}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      await tx(async q => { await q('INSERT INTO avatars (file,user_id,mime,data) VALUES (?,?,?,?)', file, userId, AV_MIME[ext], buf); await q('UPDATE users SET avatar=? WHERE user_id=? AND avatar IS NULL', file, userId); });
      return;
    }
  } catch { /* a missing photo never blocks sign-in */ }
}
app.post('/api/auth/oauth', ah(async (req, res) => {
  if (!SB_ON) return res.status(503).json({ error: 'Google sign-in is not set up on this server yet. Use your email and password.' });
  const at = typeof req.body.access_token === 'string' ? req.body.access_token : '';
  if (at.length < 20 || at.length > 6000) return res.status(400).json({ error: 'Sign-in could not be completed. Please try again.' });
  let su;
  try { su = await sbUser(at); } catch (e) { console.error('OAuth verify failed:', e.message); return res.status(502).json({ error: 'Could not reach the sign-in service. Please try again in a moment.' }); }
  if (!su || !su.id) return res.status(401).json({ error: 'Your sign-in expired before it finished. Please try again.' });
  const ids = (su.identities || []).filter(i => i.provider === 'google')
    .sort((a, b) => Date.parse(b.last_sign_in_at || 0) - Date.parse(a.last_sign_in_at || 0));
  if (!ids.length) return res.status(403).json({ error: 'Only Google sign-in is supported here.' });
  const idn = ids[0], prov = 'Google', meta = { ...(idn.identity_data || {}), ...(su.user_metadata || {}) };
  const sid = String(su.id);
  // Returning user: found by the Supabase user id, never by e-mail address.
  let u = await get('SELECT u.* FROM oauth_identities o JOIN users u ON u.user_id = o.user_id WHERE o.supabase_user_id=?', sid);
  if (!u) {
    const email = String(su.email || idn.identity_data?.email || '').trim().toLowerCase();
    if (!EMAIL.test(email)) return res.status(400).json({ error: `${prov} did not share an email address with AquaFind. Allow email access for AquaFind in your ${prov} settings and try again, or register with email.` });
    if (idn.identity_data?.email_verified === false) return res.status(403).json({ error: `Your ${prov} email address is not verified, so it cannot be used to sign in.` });
    if (await get('SELECT 1 AS x FROM users WHERE email=?', email))
      return res.status(409).json({ error: `An AquaFind account with ${email} already exists. Sign in with your email and password instead. ${prov} is not linked to it automatically.` });
    const name = String(meta.full_name || meta.name || email.split('@')[0]).replace(/\s+/g, ' ').trim().slice(0, 80);
    try {
      u = await tx(async q => {
        const row = (await q('INSERT INTO users (full_name,email,password_hash,created_at) VALUES (?,?,NULL,?) RETURNING *', name.length >= 2 ? name : email.split('@')[0].padEnd(2, '_'), email, Date.now())).rows[0];
        await q('INSERT INTO oauth_identities (supabase_user_id,user_id,provider,created_at) VALUES (?,?,?,?)', sid, row.user_id, idn.provider, Date.now());
        return row;
      });
    } catch (err) {
      if (!isDup(err)) throw err;   // two requests raced: whoever lost just signs in as the account the winner created
      u = await get('SELECT u.* FROM oauth_identities o JOIN users u ON u.user_id = o.user_id WHERE o.supabase_user_id=?', sid);
      if (!u) return res.status(409).json({ error: 'An AquaFind account with this email already exists. Sign in with your email and password instead.' });
    }
    const pic = meta.avatar_url || meta.picture;
    if (pic && u) { await importPhoto(u.user_id, String(pic)); u = await userById(u.user_id); }
  }
  if (u.active === 0) return res.status(403).json({ error: 'This account has been deactivated. Contact an administrator.' });
  res.json({ token: token(u), user: userOut(u) });
}));
app.post('/api/auth/forgot', (req, res) => {
  if (!EMAIL.test((req.body.email || '').trim())) return res.status(400).json({ error: 'Enter a valid email address.' });
  res.json({ ok: true }); // simulated: no email is actually sent
});

// Profile
app.get('/api/me', auth, (req, res) => res.json(userOut(req.user)));
app.put('/api/me', auth, ah(async (req, res) => {
  const name = (req.body.name ?? req.user.full_name).trim();
  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' });
  if (name.length > 80) return res.status(400).json({ error: 'Name is too long (80 characters at most).' });
  const email = (req.body.email ?? req.user.email).trim().toLowerCase();
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (await get('SELECT 1 AS x FROM users WHERE email=? AND user_id<>?', email, req.user.user_id))
    return res.status(409).json({ error: 'Another account already uses this email.' });
  const phone = String(req.body.phone ?? req.user.phone ?? '').trim();
  if (!/^[0-9+()\-.\s]{0,24}$/.test(phone)) return res.status(400).json({ error: 'Phone can only contain digits, spaces, + ( ) - .' });
  const flag = (v, cur) => v === undefined ? cur : (v ? 1 : 0);
  try {
    await run('UPDATE users SET full_name=?, email=?, phone=?, alerts_on=?, nearby_on=? WHERE user_id=?',
      name, email, phone, flag(req.body.alerts, req.user.alerts_on), flag(req.body.nearby, req.user.nearby_on), req.user.user_id);
  } catch (err) { if (isDup(err)) return res.status(409).json({ error: 'Another account already uses this email.' }); throw err; }
  res.json(userOut(await userById(req.user.user_id)));
}));
app.put('/api/me/password', auth, ah(async (req, res) => {
  const { current = '', next = '' } = req.body;
  if (!req.user.password_hash) return res.status(400).json({ error: 'This account signs in with Google, so it has no AquaFind password.' });
  if (!bcrypt.compareSync(current, req.user.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
  if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  if (await isWeakPassword(next)) return res.status(400).json({ error: WEAK_MSG });
  await run('UPDATE users SET password_hash=? WHERE user_id=?', bcrypt.hashSync(next, 10), req.user.user_id);
  res.json({ ok: true });
}));

// Profile picture. The image is stored in the avatars table (Supabase); users.avatar holds only its random file name.
// The browser shrinks the photo first, the server still checks size and real file type (magic bytes), never the claimed type.
const AV_MAX = 512 * 1024;
const AV_NAME = /^\d+-[a-f0-9]{16}\.(jpg|png|webp)$/;
const AV_MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const avType = b => b.length > 12 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF ? 'jpg'
  : b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) ? 'png'
  : b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' ? 'webp' : null;
const avHits = new Map();   // user id -> upload times (in memory); a photo change is rare, so 20 per 10 minutes is generous
app.put('/api/me/avatar', ah(async (req, res) => {
  const now = Date.now(), h = (avHits.get(req.user.user_id) || []).filter(t => now - t < 10 * 60000);
  if (h.length >= 20) return res.status(429).json({ error: 'Too many photo changes. Please wait a few minutes.' });
  h.push(now); avHits.set(req.user.user_id, h);
  const m = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(req.body.image || ''));
  if (!m) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP image.' });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > AV_MAX) return res.status(413).json({ error: 'That photo is too large. Choose a smaller one (under 500 KB after resizing).' });
  const ext = avType(buf); if (!ext) return res.status(400).json({ error: 'That file is not a valid JPG, PNG or WebP image.' });
  const file = `${req.user.user_id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  await tx(async q => {   // new photo in, old photo out, pointer updated: all or nothing
    await q('INSERT INTO avatars (file,user_id,mime,data) VALUES (?,?,?,?)', file, req.user.user_id, AV_MIME[ext], buf);
    await q('UPDATE users SET avatar=? WHERE user_id=?', file, req.user.user_id);
    if (AV_NAME.test(req.user.avatar || '')) await q('DELETE FROM avatars WHERE file=? AND user_id=?', req.user.avatar, req.user.user_id);
  });
  res.json(userOut(await userById(req.user.user_id)));
}));
app.delete('/api/me/avatar', ah(async (req, res) => {
  await tx(async q => {
    await q('UPDATE users SET avatar=NULL WHERE user_id=?', req.user.user_id);
    await q('DELETE FROM avatars WHERE user_id=?', req.user.user_id);
  });
  res.json(userOut(await userById(req.user.user_id)));
}));
// File names are random and change on every upload, so they can be cached for a year and used in plain <img> tags.
app.get('/api/avatars/:file', ah(async (req, res) => {
  if (!AV_NAME.test(req.params.file)) return res.status(404).end();
  const a = await get('SELECT mime, data FROM avatars WHERE file=?', req.params.file);
  if (!a) return res.status(404).end();
  res.set({ 'Content-Type': a.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(a.data);
}));

// Stations
app.get('/api/stations', auth, ah(async (req, res) => res.json(await stationRows())));
app.put('/api/stations/:id', auth, stationAdmin, ah(async (req, res) => {
  const { name = '', addr = '', tel = '' } = req.body, o = +req.body.o, c = +req.body.c;
  if (!name.trim() || !addr.trim() || !tel.trim()) return res.status(400).json({ error: 'Name, address and contact number are required.' });
  if (!(o >= 0 && o <= 23 && c >= 1 && c <= 24 && c > o)) return res.status(400).json({ error: 'Closing hour must be later than opening hour.' });
  if (!(await stationExists(req.params.id))) return res.status(404).json({ error: 'Station not found.' });
  await run('UPDATE stations SET station_name=?, address=?, contact_number=?, open_hour=?, close_hour=? WHERE station_id=?',
    name.trim(), addr.trim(), tel.trim(), o, c, req.params.id);
  if (req.user.role === 'superadmin' && (req.body.lat !== undefined || req.body.lng !== undefined)) {
    const lat = +req.body.lat, lng = +req.body.lng;
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return res.status(400).json({ error: 'Enter a valid latitude (-90 to 90) and longitude (-180 to 180).' });
    await run('UPDATE stations SET latitude=?, longitude=? WHERE station_id=?', lat, lng, req.params.id);
  }
  await addNotif(req.params.id, `${name.trim()} updated its information`, `Contact: ${tel.trim()}. Hours were changed.`);
  res.json(await oneStation(req.params.id));
}));
app.put('/api/stations/:id/availability', auth, stationAdmin, ah(async (req, res) => {
  const status = req.body.status;
  if (!STATUS.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  if (!(await stationExists(req.params.id))) return res.status(404).json({ error: 'Station not found.' });
  await run('INSERT INTO availability (station_id,status,last_updated) VALUES (?,?,?)', req.params.id, status, Date.now());
  const s = await oneStation(req.params.id);
  await addNotif(s.id, `${s.name}: ${LABEL[status]}`, `Water status was updated to ${LABEL[status]}.`, 'availability');
  res.json(s);
}));

// Saved stations
app.get('/api/saved', auth, ah(async (req, res) =>
  res.json((await all('SELECT station_id FROM saved_stations WHERE user_id=?', req.user.user_id)).map(r => r.station_id))));
app.post('/api/saved/:id', auth, ah(async (req, res) => {
  if (!(await stationExists(req.params.id))) return res.status(404).json({ error: 'Station not found.' });
  await run('INSERT INTO saved_stations (user_id,station_id) VALUES (?,?) ON CONFLICT DO NOTHING', req.user.user_id, req.params.id);
  res.json({ ok: true });
}));
app.delete('/api/saved/:id', auth, ah(async (req, res) => {
  await run('DELETE FROM saved_stations WHERE user_id=? AND station_id=?', req.user.user_id, req.params.id);
  res.json({ ok: true });
}));

// Reports
app.post('/api/reports', auth, ah(async (req, res) => {
  const { station_id, type } = req.body, note = String(req.body.note || '');
  if (typeof station_id !== 'string' || !(await stationExists(station_id)) || !type) return res.status(400).json({ error: 'Station and issue type are required.' });
  await run('INSERT INTO reports (station_id,user_id,type,note,created_at) VALUES (?,?,?,?,?)', station_id, req.user.user_id, String(type).slice(0, 300), note.trim().slice(0, 500), Date.now());
  res.json({ ok: true });
}));
app.get('/api/reports', auth, ah(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  res.json((await all(`SELECT r.report_id AS id, r.station_id AS sid, r.type AS type, r.note AS note, r.resolved AS done, r.status AS status, r.admin_note AS "adminNote", r.created_at AS t, u.full_name AS "by"
    FROM reports r JOIN users u ON u.user_id=r.user_id WHERE r.station_id=? ORDER BY r.created_at DESC`, req.user.station_id))
    .map(r => ({ ...r, done: !!r.done })));
}));
app.put('/api/reports/:id/resolve', auth, ah(async (req, res) => {
  const id = intId(req.params.id), r = id === null ? null : await get('SELECT * FROM reports WHERE report_id=?', id);
  if (!r || req.user.role !== 'admin' || r.station_id !== req.user.station_id) return res.status(403).json({ error: 'Not allowed.' });
  await run("UPDATE reports SET resolved=1, status='resolved', updated_at=? WHERE report_id=?", Date.now(), r.report_id);
  res.json({ ok: true });
}));

// Notifications: every update is returned; the app filters by the user's saved/nearby preferences
app.get('/api/notifications', auth, ah(async (req, res) => {
  const uid = req.user.user_id;
  res.json((await all(`SELECT n.notification_id AS id, n.station_id AS sid, n.title AS title, n.body AS body, n.created_at AS t, n.kind AS kind,
      EXISTS(SELECT 1 FROM notification_reads r WHERE r.user_id=? AND r.notification_id=n.notification_id) AS "read"
    FROM notifications n ORDER BY n.created_at DESC LIMIT 100`, uid)).map(n => ({ ...n, read: !!n.read })));
}));
app.put('/api/notifications/read-all', auth, ah(async (req, res) => {
  await run(`INSERT INTO notification_reads (user_id, notification_id)
    SELECT ?::int, notification_id FROM notifications ON CONFLICT DO NOTHING`, req.user.user_id);
  res.json({ ok: true });
}));
app.put('/api/notifications/:id/read', auth, ah(async (req, res) => {
  const id = intId(req.params.id);
  if (id !== null) await run(`INSERT INTO notification_reads (user_id, notification_id)
    SELECT ?::int, notification_id FROM notifications WHERE notification_id=? ON CONFLICT DO NOTHING`, req.user.user_id, id);
  res.json({ ok: true });
}));


// Community water reports: "Is there water right now?"
app.post('/api/water-reports', auth, ah(async (req, res) => {
  const { station_id, has_water, note = '' } = req.body;
  const s = (await stationRows()).find(x => x.id === station_id);
  if (!s || typeof has_water !== 'boolean') return res.status(400).json({ error: 'Pick a station and say if there is water.' });
  const recent = await get('SELECT 1 AS x FROM water_reports WHERE user_id=? AND station_id=? AND created_at>?',
    req.user.user_id, station_id, Date.now() - 10 * 60000);
  if (recent) return res.status(429).json({ error: 'You already reported this station. Try again in 10 minutes.' });
  await run('INSERT INTO water_reports (station_id,user_id,has_water,note,created_at) VALUES (?,?,?,?,?)',
    station_id, req.user.user_id, has_water ? 1 : 0, String(note).trim().slice(0, 300), Date.now());
  const c = await oneStation(station_id);
  await addNotif(station_id, `${s.name}: community report`, has_water
    ? `A user reports water is available. (${c.yes} yes, ${c.no} no in the last 3 hours)`
    : `A user reports there is no water. (${c.yes} yes, ${c.no} no in the last 3 hours)`, 'community');
  res.json(c);
}));
app.get('/api/community', auth, ah(async (req, res) => {
  res.json((await all(`SELECT w.wr_id AS id, w.station_id AS sid, s.station_name AS station, w.has_water AS has, w.note AS note, w.created_at AS t, u.full_name AS "by", u.avatar AS av, w.user_id AS uid
    FROM water_reports w JOIN users u ON u.user_id=w.user_id JOIN stations s ON s.station_id=w.station_id
    ORDER BY w.created_at DESC LIMIT 60`)).map(({ uid, ...r }) => ({ ...r, has: !!r.has, by: shortName(r.by), mine: uid === req.user.user_id })));
}));
const shortName = n => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };


// ---------- Additions for the redesigned app (all additive) ----------
// A user's own incorrect-information reports (report history)
app.get('/api/reports/mine', auth, ah(async (req, res) => {
  res.json((await all(`SELECT r.report_id AS id, r.station_id AS sid, s.station_name AS station, r.type AS type, r.note AS note, r.resolved AS done, r.status AS status, r.admin_note AS "adminNote", r.updated_at AS upd, r.created_at AS t
    FROM reports r JOIN stations s ON s.station_id=r.station_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 50`, req.user.user_id))
    .map(r => ({ ...r, done: !!r.done })));
}));
// Station-admin tools (scoped to the admin's own station, same rule as the existing admin routes)
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' || !req.user.station_id) return res.status(403).json({ error: 'Admins only.' });
  next();
}
app.get('/api/admin/history', auth, adminOnly, ah(async (req, res) => {
  res.json(await all('SELECT availability_id AS id, status, last_updated AS t FROM availability WHERE station_id=? ORDER BY availability_id DESC LIMIT 30', req.user.station_id));
}));
app.get('/api/admin/water-reports', auth, adminOnly, ah(async (req, res) => {
  res.json((await all(`SELECT w.wr_id AS id, w.has_water AS has, w.note AS note, w.created_at AS t, u.full_name AS "by"
    FROM water_reports w JOIN users u ON u.user_id=w.user_id WHERE w.station_id=? ORDER BY w.created_at DESC LIMIT 100`, req.user.station_id))
    .map(r => ({ ...r, has: !!r.has })));
}));
app.delete('/api/water-reports/:id', auth, adminOnly, ah(async (req, res) => {
  const id = intId(req.params.id), r = id === null ? null : await get('SELECT station_id FROM water_reports WHERE wr_id=?', id);
  if (!r || r.station_id !== req.user.station_id) return res.status(403).json({ error: 'Not allowed.' });
  await run('DELETE FROM water_reports WHERE wr_id=?', id);
  res.json({ ok: true });
}));
app.get('/api/admin/people', auth, adminOnly, ah(async (req, res) => {
  res.json(await all(`SELECT u.user_id AS id, u.full_name AS name, u.created_at AS since,
      (SELECT COUNT(*) FROM water_reports w WHERE w.user_id=u.user_id AND w.station_id=ss.station_id) AS water_reports,
      (SELECT COUNT(*) FROM reports r WHERE r.user_id=u.user_id AND r.station_id=ss.station_id) AS issue_reports
    FROM saved_stations ss JOIN users u ON u.user_id=ss.user_id WHERE ss.station_id=? ORDER BY u.full_name`, req.user.station_id));
}));
app.get('/api/admin/announcements', auth, adminOnly, ah(async (req, res) => {
  res.json(await all("SELECT notification_id AS id, title, body, created_at AS t FROM notifications WHERE station_id=? AND kind='announcement' ORDER BY created_at DESC LIMIT 30", req.user.station_id));
}));
app.post('/api/admin/announcements', auth, adminOnly, ah(async (req, res) => {
  const title = String(req.body.title || '').trim().slice(0, 120), body = String(req.body.body || '').trim().slice(0, 500);
  if (title.length < 3) return res.status(400).json({ error: 'Enter a title of at least 3 characters.' });
  if (body.length < 3) return res.status(400).json({ error: 'Enter the announcement message.' });
  await addNotif(req.user.station_id, title, body, 'announcement');
  res.json({ ok: true });
}));


// ---------- v8: reviews, report workflow, superadmin console ----------
const REPORT_STATUS = ['pending', 'approved', 'rejected', 'resolved'];
function superOnly(req, res, next) {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'System administrators only.' });
  next();
}

// Reviews (users). One review per user per station; the author can edit or delete it.
app.get('/api/stations/:id/reviews', auth, ah(async (req, res) => {
  if (!(await stationExists(req.params.id))) return res.status(404).json({ error: 'Station not found.' });
  const [rows, counts, st] = await Promise.all([
    all(`SELECT r.review_id AS id, r.rating AS rating, r.comment AS comment, r.status AS status, r.created_at AS t, r.updated_at AS upd, r.user_id AS uid, u.full_name AS "by", u.avatar AS av
      FROM reviews r JOIN users u ON u.user_id=r.user_id WHERE r.station_id=? AND (r.status='visible' OR r.user_id=?) ORDER BY r.updated_at DESC LIMIT 100`, req.params.id, req.user.user_id),
    all("SELECT rating, COUNT(*) AS c FROM reviews WHERE station_id=? AND status='visible' GROUP BY rating", req.params.id),
    oneStation(req.params.id)
  ]);
  const dist = [0, 0, 0, 0, 0];
  counts.forEach(r => dist[r.rating - 1] = r.c);
  res.json({ avg: st.rating, count: st.rcount, dist, items: rows.map(({ uid, by, ...r }) => ({ ...r, by: shortName(by), mine: uid === req.user.user_id })) });
}));
app.get('/api/reviews/mine', auth, ah(async (req, res) => {
  res.json(await all(`SELECT r.review_id AS id, r.station_id AS sid, s.station_name AS station, r.rating AS rating, r.comment AS comment, r.status AS status, r.updated_at AS t
    FROM reviews r JOIN stations s ON s.station_id=r.station_id WHERE r.user_id=? ORDER BY r.updated_at DESC LIMIT 50`, req.user.user_id));
}));
app.put('/api/stations/:id/reviews', auth, ah(async (req, res) => {
  if (!(await stationExists(req.params.id))) return res.status(404).json({ error: 'Station not found.' });
  const rating = req.body.rating, comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Choose a rating from 1 to 5 stars.' });
  if (comment.length > 500) return res.status(400).json({ error: 'Comments can be 500 characters at most.' });
  const now = Date.now(), cur = await get('SELECT review_id FROM reviews WHERE station_id=? AND user_id=?', req.params.id, req.user.user_id);
  await run(`INSERT INTO reviews (station_id,user_id,rating,comment,created_at,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT (station_id, user_id) DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, updated_at=EXCLUDED.updated_at`,
    req.params.id, req.user.user_id, rating, comment, now, now);
  res.json({ ok: true, updated: !!cur, station: await oneStation(req.params.id) });
}));
app.delete('/api/stations/:id/reviews', auth, ah(async (req, res) => {
  await run('DELETE FROM reviews WHERE station_id=? AND user_id=?', req.params.id, req.user.user_id);
  res.json({ ok: true, station: (await oneStation(req.params.id)) || null });
}));
app.post('/api/reviews/:id/flag', auth, ah(async (req, res) => {
  const id = intId(req.params.id), r = id === null ? null : await get("SELECT user_id FROM reviews WHERE review_id=? AND status='visible'", id);
  if (!r) return res.status(404).json({ error: 'Review not found.' });
  if (r.user_id === req.user.user_id) return res.status(400).json({ error: 'You cannot flag your own review.' });
  await run('INSERT INTO review_flags (review_id,user_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING', id, req.user.user_id, Date.now());
  res.json({ ok: true });
}));

// Report workflow: a station admin (own station) or a superadmin (any station) sets pending / approved / rejected / resolved.
app.put('/api/reports/:id/status', auth, ah(async (req, res) => {
  const id = intId(req.params.id), r = id === null ? null : await get('SELECT * FROM reports WHERE report_id=?', id);
  const allowed = r && (req.user.role === 'superadmin' || (req.user.role === 'admin' && r.station_id === req.user.station_id));
  if (!allowed) return res.status(403).json({ error: 'Not allowed.' });
  const status = req.body.status, note = req.body.note === undefined ? r.admin_note : String(req.body.note).trim().slice(0, 300);
  if (!REPORT_STATUS.includes(status)) return res.status(400).json({ error: 'Invalid report status.' });
  await run('UPDATE reports SET status=?, resolved=?, admin_note=?, updated_at=? WHERE report_id=?', status, status === 'resolved' ? 1 : 0, note, Date.now(), r.report_id);
  res.json({ ok: true, status });
}));

// Station management (superadmin)
function readStation(b, partial) {
  const name = String(b.name || '').trim(), addr = String(b.addr || '').trim(), tel = String(b.tel || '').trim();
  const o = +b.o, c = +b.c, lat = +b.lat, lng = +b.lng;
  if (!name || !addr || !tel) return { err: 'Name, address and contact number are required.' };
  if (name.length > 80 || addr.length > 160 || tel.length > 30) return { err: 'One of the fields is too long.' };
  if (!(Number.isInteger(o) && Number.isInteger(c) && o >= 0 && o <= 23 && c >= 1 && c <= 24 && c > o)) return { err: 'Closing hour must be later than opening hour (whole hours, 0-23 and 1-24).' };
  if (!(b.lat !== '' && b.lng !== '' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return { err: 'Enter a valid latitude and longitude, or click the map to place the station.' };
  return { v: { name, addr, tel, o, c, lat, lng } };
}
app.post('/api/stations', auth, superOnly, ah(async (req, res) => {
  const { err, v } = readStation(req.body); if (err) return res.status(400).json({ error: err });
  const status = STATUS.includes(req.body.status) ? req.body.status : 'available';
  const id = await tx(async q => {
    const n = (await q("SELECT MAX(CAST(SUBSTR(station_id, 2) AS INTEGER)) AS m FROM stations WHERE station_id ~ '^s[0-9]{1,9}$'")).rows[0].m || 0, id = 's' + (n + 1);
    await q('INSERT INTO stations (station_id,station_name,address,latitude,longitude,contact_number,open_hour,close_hour) VALUES (?,?,?,?,?,?,?,?)', id, v.name, v.addr, v.lat, v.lng, v.tel, v.o, v.c);
    await q('INSERT INTO availability (station_id,status,last_updated) VALUES (?,?,?)', id, status, Date.now());
    return id;
  });
  res.status(201).json(await oneStation(id));
}));
app.delete('/api/stations/:id', auth, superOnly, ah(async (req, res) => {
  const id = req.params.id; if (!(await stationExists(id))) return res.status(404).json({ error: 'Station not found.' });
  await tx(async q => {
    await q('DELETE FROM review_flags WHERE review_id IN (SELECT review_id FROM reviews WHERE station_id=?)', id);
    await q('DELETE FROM notification_reads WHERE notification_id IN (SELECT notification_id FROM notifications WHERE station_id=?)', id);
    for (const t of ['reviews', 'notifications', 'water_reports', 'reports', 'saved_stations', 'availability']) await q(`DELETE FROM ${t} WHERE station_id=?`, id);
    await q("UPDATE users SET role='user', station_id=NULL WHERE station_id=?", id);   // its manager no longer manages anything
    await q('DELETE FROM stations WHERE station_id=?', id);
  });
  res.json({ ok: true });
}));

// Dashboard analytics
app.get('/api/superadmin/analytics', auth, superOnly, ah(async (req, res) => {
  const n = async (sql, ...a) => (await get(sql, ...a)).c;
  const hours = Math.min(168, Math.max(1, +req.query.hours || 24)), now = Date.now();
  const [st, uTotal, uActive, uInactive, uAdmins, uSupers, uNew, repCounts, rv, rvHidden, rvFlagged, wr24] = await Promise.all([
    stationRows(),
    n('SELECT COUNT(*) AS c FROM users'), n('SELECT COUNT(*) AS c FROM users WHERE active=1'), n('SELECT COUNT(*) AS c FROM users WHERE active=0'),
    n("SELECT COUNT(*) AS c FROM users WHERE role='admin'"), n("SELECT COUNT(*) AS c FROM users WHERE role='superadmin'"),
    n('SELECT COUNT(*) AS c FROM users WHERE created_at>?', now - 7 * 86400000),
    all('SELECT status, COUNT(*) AS c FROM reports GROUP BY status'),
    get("SELECT COUNT(*) AS c, ROUND(AVG(rating),2) AS avg FROM reviews WHERE status='visible'"),
    n("SELECT COUNT(*) AS c FROM reviews WHERE status='hidden'"),
    n("SELECT COUNT(DISTINCT f.review_id) AS c FROM review_flags f JOIN reviews r ON r.review_id=f.review_id WHERE r.status='visible'"),
    n('SELECT COUNT(*) AS c FROM water_reports WHERE created_at>?', now - 86400000)
  ]);
  const by = k => st.filter(s => s.status === k).length;
  const rep = {}; REPORT_STATUS.forEach(k => rep[k] = repCounts.find(r => r.status === k)?.c || 0);
  res.json({
    users: { total: uTotal, active: uActive, inactive: uInactive, admins: uAdmins, superadmins: uSupers, newWeek: uNew },
    stations: { total: st.length, available: by('available'), low: by('low'), out: by('out'), closed: by('closed'), stale: st.filter(s => now - s.upd > hours * 3600000).length, staleHours: hours },
    reports: rep, reviews: { total: rv.c, avg: rv.avg, hidden: rvHidden, flagged: rvFlagged },
    waterReports24h: wr24
  });
}));
// Availability monitoring: every station with its latest update, number of changes in 7 days and whether it is outdated
app.get('/api/superadmin/availability', auth, superOnly, ah(async (req, res) => {
  const hours = Math.min(168, Math.max(1, +req.query.hours || 24)), week = Date.now() - 7 * 86400000;
  const [rows, st] = await Promise.all([
    all('SELECT station_id AS sid, COUNT(*) AS c FROM availability WHERE last_updated>? GROUP BY station_id', week), stationRows()]);
  const chg = {}; rows.forEach(r => chg[r.sid] = r.c);
  res.json({ hours, items: st.map(s => ({ id: s.id, name: s.name, addr: s.addr, status: s.status, upd: s.upd, changes7d: chg[s.id] || 0, stale: Date.now() - s.upd > hours * 3600000, yes: s.yes, no: s.no })).sort((a, b) => a.upd - b.upd) });
}));
// User management
app.get('/api/superadmin/users', auth, superOnly, ah(async (req, res) => {
  res.json((await all(`SELECT u.user_id AS id, u.full_name AS name, u.email AS email, u.phone AS phone, u.role AS role, u.station_id AS station, u.active AS active, u.created_at AS since, u.avatar AS avatar,
      (SELECT COUNT(*) FROM saved_stations x WHERE x.user_id=u.user_id) AS saved,
      (SELECT COUNT(*) FROM reviews x WHERE x.user_id=u.user_id) AS reviews,
      (SELECT COUNT(*) FROM reports x WHERE x.user_id=u.user_id) AS reports
    FROM users u ORDER BY u.created_at DESC`)).map(u => ({ ...u, active: u.active !== 0 })));
}));
app.put('/api/superadmin/users/:id', auth, superOnly, ah(async (req, res) => {
  const uid = intId(req.params.id), u = uid === null ? null : await userById(uid);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const b = req.body, self = u.user_id === req.user.user_id;
  let role = u.role, station = u.station_id, active = u.active;
  if (b.active !== undefined) { if (self) return res.status(400).json({ error: 'You cannot deactivate your own account.' }); active = b.active ? 1 : 0; }
  if (b.role !== undefined) {
    if (self) return res.status(400).json({ error: 'You cannot change your own role.' });
    if (!['user', 'admin', 'superadmin'].includes(b.role)) return res.status(400).json({ error: 'Invalid role.' });
    role = b.role; station = role === 'admin' ? (b.station ?? u.station_id) : null;
    if (role === 'admin' && !(typeof station === 'string' && await stationExists(station))) return res.status(400).json({ error: 'Choose the station this administrator will manage.' });
  } else if (b.station !== undefined) {
    if (u.role !== 'admin') return res.status(400).json({ error: 'Only station administrators have a station.' });
    if (!(typeof b.station === 'string' && await stationExists(b.station))) return res.status(400).json({ error: 'Station not found.' });
    station = b.station;
  }
  await run('UPDATE users SET role=?, station_id=?, active=? WHERE user_id=?', role, station, active, u.user_id);
  res.json({ ok: true });
}));
// Reports across every station
app.get('/api/superadmin/reports', auth, superOnly, ah(async (req, res) => {
  res.json(await all(`SELECT r.report_id AS id, r.station_id AS sid, s.station_name AS station, r.type AS type, r.note AS note, r.status AS status, r.admin_note AS "adminNote", r.created_at AS t, r.updated_at AS upd, u.full_name AS "by"
    FROM reports r JOIN stations s ON s.station_id=r.station_id JOIN users u ON u.user_id=r.user_id ORDER BY (r.status='pending') DESC, r.created_at DESC LIMIT 300`));
}));
// Review moderation
app.get('/api/superadmin/reviews', auth, superOnly, ah(async (req, res) => {
  res.json(await all(`SELECT r.review_id AS id, r.station_id AS sid, s.station_name AS station, r.rating AS rating, r.comment AS comment, r.status AS status, r.updated_at AS t, u.full_name AS "by", u.user_id AS uid,
      (SELECT COUNT(*) FROM review_flags f WHERE f.review_id=r.review_id) AS flags
    FROM reviews r JOIN stations s ON s.station_id=r.station_id JOIN users u ON u.user_id=r.user_id ORDER BY flags DESC, r.updated_at DESC LIMIT 300`));
}));
app.put('/api/superadmin/reviews/:id', auth, superOnly, ah(async (req, res) => {
  if (!['visible', 'hidden'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid review status.' });
  const id = intId(req.params.id), r = id === null ? { rowCount: 0 } : await run('UPDATE reviews SET status=? WHERE review_id=?', req.body.status, id);
  if (!r.rowCount) return res.status(404).json({ error: 'Review not found.' });
  if (req.body.status === 'visible') await run('DELETE FROM review_flags WHERE review_id=?', id);   // cleared by a moderator
  res.json({ ok: true });
}));
app.delete('/api/superadmin/reviews/:id', auth, superOnly, ah(async (req, res) => {
  const id = intId(req.params.id);
  if (id === null || !(await run('DELETE FROM reviews WHERE review_id=?', id)).rowCount) return res.status(404).json({ error: 'Review not found.' });
  res.json({ ok: true });   // its flags are removed with it (ON DELETE CASCADE)
}));


// AquaBot: uses Claude when ANTHROPIC_API_KEY is set, otherwise a built-in rule-based helper
const kmBetween = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const fmtDist = k => k < 1 ? `${Math.round(k * 100) * 10} m` : `${k.toFixed(1)} km`;
const hourOpen = s => { const h = new Date().getHours(); return s.o != null && s.status !== 'closed' && h >= s.o && h < s.c; };   // unknown hours (NULL) are never reported as open
const mins = t => Math.max(1, Math.round((Date.now() - t) / 60000));
function describe(s) {
  const c = s.yes || s.no ? ` Community (3h): ${s.yes} say water, ${s.no} say no water.` : '';
  return `${s.name} (${s.addr}) is ${LABEL[s.status]}, ${fmtDist(s.d)} away, updated ${mins(s.upd)} min ago.${c}`;
}
function basicReply(msg, list) {
  const t = msg.toLowerCase(), by = list.filter(s => s.status === 'available' || s.status === 'low').sort((a, b) => a.d - b.d);
  const key = s => [s.name.toLowerCase().split(/\s+/)[0], (s.addr.split(',')[1] || '#').trim().toLowerCase()]; // brand word + area, so "station"/"water" never match
  const named = list.find(s => key(s).some(w => w.length > 2 && t.includes(w)));
  if (/^(hi|hello|hey)\b/.test(t)) return { reply: 'Hi! I can find the nearest station with water, check a specific station, or tell you who is open now. What do you need?', ids: [] };
  if (/report|wrong|incorrect/.test(t)) return { reply: 'To tell others if there is water, tap the + button and choose "Yes" or "No water". To flag wrong details like hours or address, open a station and tap "Report incorrect info".', ids: [] };
  if (named) return { reply: describe(named) + (named.status === 'out' || named.status === 'closed' ? ` The nearest alternative is ${by[0]?.name || 'not available right now'}.` : ''), ids: [named.id] };
  if (/open|hours|24/.test(t) && !list.some(x => x.o != null)) return { reply: 'Opening hours are not listed for these stations yet. Open a station page or call ahead to confirm.', ids: [] };
  if (/open|hours|24/.test(t)) { const o = list.filter(hourOpen).sort((a, b) => a.d - b.d).slice(0, 4); return { reply: o.length ? 'Open right now: ' + o.map(s => `${s.name} (${fmtDist(s.d)})`).join(', ') + '.' : 'No stations are open right now.', ids: o.map(s => s.id) }; }
  if (/low/.test(t)) { const o = list.filter(s => s.status === 'low'); return { reply: o.length ? 'Low supply at: ' + o.map(s => s.name).join(', ') + '. Check before you go.' : 'No stations report low supply right now.', ids: o.map(s => s.id) }; }
  if (/out of water|no water|empty/.test(t)) { const o = list.filter(s => s.status === 'out'); return { reply: o.length ? 'Out of water: ' + o.map(s => s.name).join(', ') + '.' : 'No stations are out of water right now.', ids: o.map(s => s.id) }; }
  if (/near|close|where|find|water|refill|available/.test(t)) {
    if (!by.length) return { reply: 'No station has water right now. Try again in a few minutes or check the community feed.', ids: [] };
    return { reply: `The nearest station with water is ${by[0].name}, ${fmtDist(by[0].d)} away (${LABEL[by[0].status]}).` + (by[1] ? ` Next: ${by[1].name} at ${fmtDist(by[1].d)}.` : ''), ids: by.slice(0, 3).map(s => s.id) };
  }
  return { reply: 'I can help with: "nearest station with water", "is BlueDrop available?", "what is open now?" or how to report water status.', ids: [] };
}
app.post('/api/chat', auth, ah(async (req, res) => {
  const msg = String(req.body.message || '').trim().slice(0, 500);
  if (!msg) return res.status(400).json({ error: 'Type a message first.' });
  const lat = +req.body.lat || 9.786, lng = +req.body.lng || 125.488;
  const list = (await stationRows()).map(s => ({ ...s, d: kmBetween(lat, lng, s.lat, s.lng) }));
  const fallback = () => { const r = basicReply(msg, list); return { reply: r.reply, stations: r.ids, ai: false }; };
  if (!process.env.ANTHROPIC_API_KEY) return res.json(fallback());
  try {
    const history = (Array.isArray(req.body.history) ? req.body.history : []).slice(-8)
      .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string').map(m => ({ role: m.role, content: m.text.slice(0, 500) }));
    while (history.length && history[0].role !== 'user') history.shift();
    const data = list.sort((a, b) => a.d - b.d).map(s =>
      `- ${s.name} | ${s.addr} | status: ${LABEL[s.status]} | ${fmtDist(s.d)} away | hours ${s.o == null ? 'not listed' : s.o + ':00-' + s.c + ':00'} | phone ${s.tel || 'not listed'} | updated ${mins(s.upd)} min ago | community last 3h: ${s.yes} water, ${s.no} no water`).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 400,
        system: `You are AquaBot, the assistant in AquaFind, an app that shows water refill stations in Surigao City, Philippines. Answer briefly (max 3 short sentences), friendly and plain. Use ONLY the live station data below; never invent stations or statuses. Statuses can be outdated, so remind people to check the updated time when it matters. If asked how to report: the + button reports "water" or "no water"; "Report incorrect info" on a station page flags wrong details.\nLive data (now ${new Date().toLocaleTimeString()}):\n${data}`,
        messages: [...history, { role: 'user', content: msg }] })
    });
    if (!r.ok) throw new Error('api ' + r.status);
    const reply = (await r.json()).content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!reply) throw new Error('empty');
    res.json({ reply, stations: list.filter(s => reply.includes(s.name)).slice(0, 3).map(s => s.id), ai: true });
  } catch (e) { console.log('Chat fell back to basic mode:', e.message); res.json(fallback()); }
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large. Choose a smaller photo.' });
  console.error(err); res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Start only once the database is ready
initDatabase().then(() => {
  const server = app.listen(PORT, () => console.log(`AquaFind running at http://localhost:${PORT} (database: Supabase PostgreSQL)`));
  const stop = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}).catch(e => { console.error('Could not start: the database is not reachable or not set up.\n', e.message); process.exit(1); });
