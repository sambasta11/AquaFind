// One-time copy of an existing AquaFind SQLite database (and its avatars folder) into Supabase.
//   cd backend
//   npm install
//   DATABASE_URL="postgresql://..."  node scripts/migrate-sqlite-to-supabase.js  path/to/aquafind.db
// Run it BEFORE the first server start (the server seeds sample data into an empty database).
// If the Supabase tables already hold data, add --wipe to empty them first.  Ids are kept, so nothing else changes.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { pool, run, all, get, tx, applySchema } = require('../db');

const args = process.argv.slice(2), wipe = args.includes('--wipe'), file = args.find(a => !a.startsWith('--'));
if (!file || !fs.existsSync(file)) { console.error('Usage: node scripts/migrate-sqlite-to-supabase.js <path to aquafind.db> [--wipe]'); process.exit(1); }
const lite = new DatabaseSync(file, { readOnly: true });
const AV_DIR = path.join(path.dirname(path.resolve(file)), 'avatars');
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// Parents before children (foreign keys). `identity` = [table, id column] pairs that need their counter moved past the copied ids.
const TABLES = ['stations', 'users', 'availability', 'saved_stations', 'reports', 'notifications', 'notification_reads', 'water_reports', 'reviews', 'review_flags'];
const IDENTITY = { users: 'user_id', availability: 'availability_id', reports: 'report_id', notifications: 'notification_id', water_reports: 'wr_id', reviews: 'review_id' };

(async () => {
  await applySchema();
  const existing = (await get('SELECT (SELECT COUNT(*) FROM stations) + (SELECT COUNT(*) FROM users) AS c')).c;
  if (existing && !wipe) { console.error(`The Supabase database already has data (${existing} stations/users). Run again with --wipe to replace it.`); process.exit(1); }
  const liteTables = new Set(lite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name));
  const counts = {};
  await tx(async q => {
    if (wipe) await q('TRUNCATE avatars, review_flags, reviews, water_reports, notification_reads, notifications, reports, saved_stations, availability, users, stations RESTART IDENTITY CASCADE');
    for (const t of TABLES) {
      counts[t] = 0;
      if (!liteTables.has(t)) continue;
      for (const row of lite.prepare(`SELECT * FROM ${t}`).all()) {
        const cols = Object.keys(row);   // only the columns this old database has; the rest take their defaults
        await q(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...cols.map(c => row[c]));
        counts[t]++;
      }
    }
    // Profile pictures: file on disk -> avatars table. A missing file just clears the pointer.
    counts.avatars = 0;
    for (const u of lite.prepare("SELECT user_id, avatar FROM users WHERE avatar IS NOT NULL AND avatar <> ''").all()) {
      const f = path.join(AV_DIR, path.basename(u.avatar)), ext = path.extname(u.avatar).slice(1).toLowerCase();
      if (MIME[ext] && fs.existsSync(f)) { await q('INSERT INTO avatars (file,user_id,mime,data) VALUES (?,?,?,?)', u.avatar, u.user_id, MIME[ext], fs.readFileSync(f)); counts.avatars++; }
      else await q('UPDATE users SET avatar=NULL WHERE user_id=?', u.user_id);
    }
    for (const [t, c] of Object.entries(IDENTITY))   // next new row gets max(id)+1
      await q(`SELECT setval(pg_get_serial_sequence('${t}', '${c}'), COALESCE((SELECT MAX(${c}) FROM ${t}), 0) + 1, false)`);
  });
  console.log('Copied:', Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', '));
  console.log('Done. Start the server normally; it will find the data already there.');
  await pool.end();
})().catch(async e => { console.error('Migration failed, nothing was changed:', e.message); await pool.end().catch(() => { }); process.exit(1); });
