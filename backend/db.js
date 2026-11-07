// AquaFind database layer: Supabase (PostgreSQL) through the `pg` driver.
// The Express server is the only thing that talks to the database. It connects with the
// connection string from Supabase (Project Settings > Database > Connection string),
// so the Supabase anon / service keys are never needed and never reach the browser.
const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// pg returns BIGINT (OID 20, also COUNT/SUM) and NUMERIC (OID 1700, also AVG/ROUND) as strings. The app expects numbers.
types.setTypeParser(20, v => Number(v));
types.setTypeParser(1700, v => Number(v));

let url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('Refusing to start: set DATABASE_URL to your Supabase Postgres connection string\n' +
    '(Supabase dashboard > Project Settings > Database > Connection string). See DEPLOY.md.');
  process.exit(1);
}
// pg treats ?sslmode=require as "verify the certificate chain", which fails against Supabase's own CA. TLS is set below instead.
try { const u = new URL(url); u.searchParams.delete('sslmode'); url = u.toString(); } catch { /* keep as given */ }
const LOCAL = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);

// DB_SCHEMA is for the automated tests only: they run inside their own schema so they never touch real data.
const SCHEMA = process.env.DB_SCHEMA || '';
if (SCHEMA && !/^[a-z_][a-z0-9_]{0,40}$/.test(SCHEMA)) { console.error('DB_SCHEMA may only contain a-z, 0-9 and _.'); process.exit(1); }

const pool = new Pool({
  connectionString: url,
  ssl: LOCAL || process.env.DATABASE_SSL === '0' ? false : { rejectUnauthorized: false },
  max: +process.env.DB_POOL_MAX || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
pool.on('error', e => console.error('Idle database connection error:', e.message));
if (SCHEMA) pool.on('connect', c => c.query(`SET search_path TO ${SCHEMA}, public`));

// SQL in server.js is written with ? placeholders; pg wants $1, $2, ...
const toPg = sql => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
const run = (sql, ...args) => pool.query(toPg(sql), args);           // full result (rows, rowCount)
const all = async (sql, ...args) => (await run(sql, ...args)).rows;   // every row
const get = async (sql, ...args) => (await run(sql, ...args)).rows[0]; // first row or undefined

// Several statements that succeed or fail together. fn receives q(sql, ...args) bound to one connection.
async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const out = await fn((sql, ...args) => c.query(toPg(sql), args));
    await c.query('COMMIT');
    return out;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => { });
    throw e;
  } finally { c.release(); }
}

// Creates the tables if they do not exist yet (safe to run on every start).
async function applySchema() {
  if (SCHEMA) {
    if (process.env.DB_SCHEMA_RESET === '1') {
      if (SCHEMA === 'public') throw new Error('Refusing to reset the public schema.');
      await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    }
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  }
  await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}

module.exports = { pool, run, all, get, tx, applySchema, SCHEMA };
