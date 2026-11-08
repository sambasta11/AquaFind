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

## 6. Google and Facebook sign-in (real OAuth, one-time setup)
AquaFind never sees Google/Facebook passwords or secrets. The browser signs in through Supabase Auth, and the server verifies the result.
Nothing works until ALL of the steps below are done. `<ref>` is your Supabase project reference (the part before `.supabase.co`).

**A. Google Cloud Console** (console.cloud.google.com)
1. Create or pick a project. Open *APIs & Services > OAuth consent screen* (newer UI: *Google Auth Platform*).
2. User type **External**. Fill in app name `AquaFind`, support e-mail, developer contact e-mail. Scopes: the defaults `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` are enough.
3. Publish the app (*Publishing status: In production*). While it says *Testing*, only e-mails you list as test users can sign in.
4. *Credentials > Create credentials > OAuth client ID > Web application*. Under **Authorized redirect URIs** add exactly `https://<ref>.supabase.co/auth/v1/callback`.
5. Copy the **Client ID** and **Client secret**.

**B. Meta for Developers** (developers.facebook.com)
1. *My Apps > Create app*. Choose the use case **Authenticate and request data from users with Facebook Login**, name it `AquaFind`.
2. In *Facebook Login > Settings* add `https://<ref>.supabase.co/auth/v1/callback` to **Valid OAuth Redirect URIs**. Keep *Client OAuth login* and *Web OAuth login* on.
3. Make sure the permissions `public_profile` and `email` are enabled for the app (*Use cases > Customize*). Both work without app review.
4. *App settings > Basic*: copy **App ID** and **App Secret**. Add a Privacy Policy URL and an app icon/category.
5. While the app is in **Development** mode only people with a role on the app (admins, developers, testers) can sign in. Switch to **Live** for everyone (needs the privacy policy URL from step 4).

**C. Supabase dashboard**
1. *Authentication > Sign In / Providers (or Providers) > Google*: enable, paste Client ID + Client secret, save. Do the same for **Facebook** with App ID + App Secret.
2. *Authentication > URL Configuration*: set **Site URL** to your app URL (e.g. `https://aquafind.onrender.com`) and add the same URL, with a trailing `/`, under **Redirect URLs**. For local testing also add `http://localhost:3000/`. The address must match exactly or Supabase sends people to the Site URL instead.
3. Optional but recommended: in the *Email* provider switch off *Allow new users to sign up*, because AquaFind keeps its own e-mail accounts and uses Supabase Auth only for Google/Facebook.
4. *Project Settings > API*: copy the **Project URL** and the **anon / publishable** key. Do not copy the service_role / secret key anywhere.

**D. AquaFind**
1. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (Render: *Environment*; local: `backend/.env`). Restart. The tables are updated automatically on start (`users.password_hash` becomes optional and `oauth_identities` is created).
2. Open the sign-in page and try each case below with a real account:
   first Google login, returning Google login, first Facebook login, returning Facebook login, press *Cancel* / *Don't allow* on the provider page (you should see a message and the buttons work again), refresh after signing in (still signed in), sign out and in again, open `#/saved` while signed out (goes to sign-in).
- If a button answers "not switched on" or "not set up yet", step C1 or D1 is missing. If you land back on the Site URL without being signed in, step C2 does not match the address you used.
- Running `node backend/test/oauth.js` checks AquaFind's side against a mock Supabase. It cannot check A, B or C; only a real sign-in can.

## Known limits
- Map tiles (OpenStreetMap) and in-app directions (routing.openstreetmap.de) need internet and are not cached; OSM's tile and routing servers are for light use. For heavy traffic use a tile provider with an API key.
- Google/Facebook sign-in needs the one-time setup in section 6. The installed Android app (Capacitor WebView) cannot use it: Google refuses OAuth inside embedded WebViews. Use the website/PWA, or add an in-app-browser + deep-link flow first.
- A Facebook account with no e-mail address (phone-only) cannot sign in; AquaFind needs an e-mail to create the account and says so.
- iOS has no install prompt API, so the app shows Share-menu instructions instead; web push notifications are not implemented (alerts are in-app).
