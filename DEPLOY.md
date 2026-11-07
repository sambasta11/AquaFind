# Deploying AquaFind

AquaFind is one Node process: Express serves the API and the `frontend/` folder, and keeps its data in a **Supabase** (PostgreSQL) database.
The PWA needs **HTTPS** (service worker, install prompt, GPS). `localhost` is exempt for testing.

## 0. Set up Supabase (once)
1. Create a project at https://supabase.com (Dashboard > New project). Save the **database password** you choose.
2. Open **Project Settings > Database > Connection string**, pick **Session pooler** (works from IPv4 hosts such as Render) and copy the URI. Put your password in place of `[YOUR-PASSWORD]` (encode special characters: `@` -> `%40`, `#` -> `%23`).
3. Use that URI as `DATABASE_URL` (see `.env.example`). Locally, put it in `backend/.env`; on a host, add it in the environment settings.
4. Nothing else to do: on start the server creates the tables (`backend/schema.sql`) and, on a brand-new database, the sample stations. You can also paste `schema.sql` into the Supabase **SQL Editor** and run it yourself.
5. **Row Level Security is switched on for every table with no policies.** This is deliberate: Supabase publishes tables through a public REST API, and without RLS anyone holding the public anon key could read user rows. AquaFind's server connects directly with the database password and is not affected. Do not add policies or use the `supabase-js` client with the anon key from the browser.

Moving data from an existing SQLite install: before the first start, run `cd backend && npm install && node scripts/migrate-sqlite-to-supabase.js path/to/aquafind.db` (with `DATABASE_URL` set). It copies every table with the same ids, moves the profile pictures from the `avatars` folder into the database, and refuses to run if Supabase already has data (add `--wipe` to replace it).

## 1. Required environment variables
See `.env.example`. The server refuses to start without `DATABASE_URL`, and in production without a strong `JWT_SECRET`.
In production the demo accounts (user@/admin@aquafind.com) are **not** created. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`
before the first run to create the admin of station `s1`. (To create the admin later, set `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`, or in the Supabase Table Editor change a user's `role` to `admin` and set its `station_id`.) Users register in the app.

## 2. Hosting (any host that runs Node 22.13+; no persistent disk needed)
- **Render:** push the project to GitHub, New > Blueprint, pick the repo (uses `render.yaml`), fill DATABASE_URL, ADMIN_EMAIL / ADMIN_PASSWORD. The free plan works because the data is in Supabase (it sleeps when idle).
- **Railway / Fly.io / a VPS:** run `cd backend && npm install && npm start`, set `DATABASE_URL`, put HTTPS in front (the platform proxy, Caddy or nginx) and set `TRUST_PROXY=true`.
- Backups: Supabase backs up the database (daily on paid plans; on the free plan export it yourself, e.g. `pg_dump` with the same connection string). Profile photos are stored in the database (`avatars` table), so they are included.
- Hosts on IPv4 only (Render and others) must use the **Session pooler** string; the "Direct connection" host is IPv6-only unless you buy Supabase's IPv4 add-on. The Transaction pooler (port 6543) also works.
- The free Supabase plan pauses a project after about a week without activity; open the dashboard to resume it.

## 3. Production API URL
- **Same origin (recommended):** the app and API are served by the same server. Nothing to configure; `frontend/config.js` keeps `AQF_API_BASE = ''`.
- **Split hosting / Android app:** set `window.AQF_API_BASE = 'https://api.example.com'` in `frontend/config.js` and set `ALLOWED_ORIGINS` on the API to the origin(s) serving the frontend (comma-separated, no trailing slash). Other origins are refused by CORS.

## 4. Releasing updates
Bump `VERSION` in `frontend/sw.js` only when you add or remove files in its `SHELL` list. HTML/CSS/JS are fetched network-first, so
users get new code on their next online launch; a new service worker shows an "Update" prompt.

## 5. Checklist after deploying
1. `https://your-host/healthz` returns `{"ok":true}`.
2. Chrome DevTools > Application: Manifest has no errors, Service Worker is "activated", "Installable" is shown.
3. On Android Chrome the install banner/Install button appears; on iPhone Safari use Share > Add to Home Screen.
4. Turn on airplane mode in the installed app: an offline banner appears and no availability is shown as live.
5. Run `DATABASE_URL=... node backend/test/smoke.js` after changes to the API. It works inside its own throwaway schema (`smoke_xxxx`, dropped at the end), so real data is not touched; still, prefer a separate Supabase test project or a local Postgres.

## Known limits
- Map tiles (OpenStreetMap) and in-app directions (routing.openstreetmap.de) need internet and are not cached; OSM's tile and routing servers are for light use. For heavy traffic use a tile provider with an API key.
- Google/Facebook sign-in is simulated (disabled in production unless `ALLOW_SIMULATED_SOCIAL=1`). Replace with real OAuth before relying on it.
- iOS has no install prompt API, so the app shows Share-menu instructions instead; web push notifications are not implemented (alerts are in-app).
