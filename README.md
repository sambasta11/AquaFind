# AquaFind - Water Refill Station Locator (Full Stack)

    aquafind-fullstack/
    +-- backend/   Node.js + Express REST API + Supabase (PostgreSQL) database
    |   +-- server.js    API routes, JWT login, seed data
    |   +-- db.js        Supabase connection (pg pool) and query helpers
    |   +-- schema.sql   Tables: users, stations, availability, saved_stations, reports, water_reports, notifications, reviews, review_flags, avatars (Row Level Security on)
    |   +-- scripts/migrate-sqlite-to-supabase.js   one-time copy of an old aquafind.db into Supabase
    +-- frontend/  Responsive web app (served by the backend; no build step)
        +-- index.html   Page shell
        +-- styles.css   Design system: tokens, components, layouts (desktop, tablet, mobile)
        +-- js/core.js   Helpers, icons, status system, state, API layer, live location
        +-- js/maps.js   Leaflet map, status pins, directions
        +-- js/views.js  User screens and sign-in / sign-up
        +-- js/admin.js  Station admin console
        +-- js/main.js   Hash router, app shell, actions, form validation
        +-- js/pwa.js    Service worker registration, install flow (Android + iOS), offline banner, update prompt
        +-- sw.js manifest.webmanifest offline.html config.js icons/   PWA files
        +-- fonts/ img/  Bundled Manrope + Inter (no external font requests), contour artwork

## Run
1. Install Node.js 22.13 or newer (check with: node -v)
2. Create a free Supabase project and copy its connection string (DEPLOY.md, "Set up Supabase"). Copy `.env.example` to `backend/.env` and set `DATABASE_URL` (for local testing you can leave the other values empty).
3. cd backend
4. npm install   (one time)
5. npm start
6. Open http://localhost:3000  (phone: use your computer's IP on the same Wi-Fi)

The tables are created in Supabase, with sample data, on first run. To reset: in the Supabase SQL Editor run `drop schema public cascade; create schema public;` on a project used only for AquaFind (this deletes everything in it), then start the server again.

## Demo accounts
- User:  user@aquafind.com / user123
- Admin: admin@aquafind.com / admin123 (manages BlueDrop, station s1)

## API (all except /api/auth/* need "Authorization: Bearer <token>")
- POST /api/auth/register | /login | /social | /forgot
- GET/PUT /api/me
- GET /api/stations; PUT /api/stations/:id (admin); PUT /api/stations/:id/availability (admin)
- GET /api/saved; POST/DELETE /api/saved/:id
- POST/GET /api/reports (report incorrect info); PUT /api/reports/:id/resolve (admin)
- GET /api/notifications; PUT /api/notifications/read-all; PUT /api/notifications/:id/read

## Notes
- Passwords are hashed (bcrypt); sessions use JWT. Change JWT_SECRET before real deployment.
- Google/Facebook login is simulated (POST /api/auth/social). Replace with real OAuth later.
- The map uses Leaflet + OpenStreetMap (no API key). Tiles need an internet connection; Leaflet itself is bundled in frontend/vendor/leaflet.
- In-app directions (route line + turn-by-turn steps for drive, bike and walk) use the free OpenStreetMap routing service at routing.openstreetmap.de. It needs internet and is meant for light use.

## New: water reports, community feed and AquaBot
- **Report if there's water:** tap the + button in the bottom bar (or "Has water / No water" on a station page). Reports are stored in `water_reports`, shown on the station card as "X say water / Y say no water" (last 3 hours), appear in the Community tab, and notify people who saved that station. One report per user per station every 10 minutes. Community reports sit beside the official status set by the station admin; they never overwrite it.
  - POST /api/water-reports  { station_id, has_water: true|false, note }
  - GET /api/community
- **AquaBot (AI chatbot):** tap the sparkle button in the top bar. POST /api/chat { message, history, lat, lng }.
  - With an Anthropic key it answers using Claude with the live station data: `ANTHROPIC_API_KEY=sk-ant-... npm start` (optional `ANTHROPIC_MODEL`, default claude-sonnet-4-6).
  - Without a key (or if the API call fails) it falls back to a built-in helper that answers the common questions: nearest station with water, status of a named station, what is open, low supply, how to report.
- Profile: the email can now be edited and the password changed (PUT /api/me, PUT /api/me/password).
- Profile photo: PUT /api/me/avatar { image: "data:image/...;base64,..." } and DELETE /api/me/avatar (see v7 below).
- Notifications: "Saved stations" and "Nearby stations" (within 1 km of the selected location) are separate toggles.

## Windows: easiest way to run
Double-click **start.bat** in the project folder. It installs the packages the first time, opens http://localhost:3000 and starts the server. (It uses Command Prompt, so PowerShell's "running scripts is disabled" error does not apply.) Needs Node.js 22.13 or newer: run `node -v` to check, or install the LTS version from nodejs.org.

The data lives in Supabase (see DEPLOY.md), so start.bat needs `backend\.env` with your `DATABASE_URL` the first time.


## Redesign notes (v2 interface)
- Routes are hash based, so the browser Back button and deep links work: `#/` home, `#/stations`, `#/map[/id]`, `#/station/:id[/directions|/report]`, `#/reports`, `#/saved`, `#/notifications`, `#/account`, `#/ask`, `#/admin[/overview|availability|issues|community|announcements|people]`.
- Status is shown by a tank-gauge glyph (full / half / slashed / lidded) plus a text label, never color alone. The same shapes are used for map pins.
- Station admins land in the admin console after sign-in; "Back to app" returns to the user view.
- Additive API endpoints used by the new screens (existing routes are unchanged):
  - GET /api/reports/mine (a user's own incorrect-info report history)
  - GET /api/admin/history, /api/admin/water-reports, /api/admin/people, /api/admin/announcements (station admin only, scoped to their station)
  - POST /api/admin/announcements { title, body }; DELETE /api/water-reports/:id (station admin removes a community report for their station)
  - GET /api/community now also returns `mine`; GET /api/notifications also returns `kind`. The `notifications` table gains a `kind` column automatically on first run.
- The admin role is still one admin per station, so "user management" is a Followers list for that station (no email or contact data shown).


## v3: installable app (PWA)
- Installable on Android (Chrome/Edge install button on Home and Profile) and iPhone (Share > Add to Home Screen instructions, shown only on iOS). Runs standalone with the AquaFind icon, safe-area padding and no browser chrome.
- Bottom navigation is now Home, Explore (map + station list), Community, Saved, Profile. AquaBot and Notifications stay in the top bar.
- Offline: the app shell, fonts, Leaflet and icons are cached. Live data is never cached: `/api/*` always goes to the network, so availability is never shown from memory. When offline a banner explains it (with the last update time if data was already loaded), and a saved session is kept instead of being signed out.
- Backend (production): `JWT_SECRET` required, `DATABASE_URL` (Supabase), `ALLOWED_ORIGINS` (CORS), `TRUST_PROXY`, HTTPS redirect + HSTS, security headers/CSP, sign-in rate limit, no demo accounts, `/healthz`. See DEPLOY.md and .env.example.
- Tests: `cd backend && node test/smoke.js` (33 API checks, run in a throwaway schema of the database in `DATABASE_URL`).
- Optional Android APK wrapper: see mobile/README.md.

## v4: phone-only layout, motion, AquaBot chat
- The UI is a single phone layout (no desktop breakpoints). `#phone` > `#scroll` holds the screens and `#tabs` holds the fixed bottom nav. On real phones and installed PWAs it fills the screen. On wide screens it is a centred phone column; with a mouse (and not installed) it is drawn inside a device frame. Safe areas are handled through `--sat` / `--sab`.
- Motion (CSS only, no new dependencies; all of it respects `prefers-reduced-motion`): route transitions (fade between tabs, slide for deeper/back screens), a sliding tab indicator, press feedback, staggered card entrance, skeleton loaders, bottom-sheet dialogs, animated map sheet, toasts with icons and exit, and a highlight when a station's status changes after a refresh.
- AquaBot: bubbles with timestamps, suggestions, animated send button, bouncing-dot typing indicator that stays until the backend answers, then the real reply is revealed word by word (the API does not stream), retry on error without duplicating your message, double-send blocked, history kept while signed in.
- UI tests: `cd tests && npm install && npm test` (jsdom: layout structure, navigation, install flows, offline, AquaBot flow, service worker). `node backend/test/smoke.js` still covers the API.

## v5: visual redesign
Blue water identity (palette in `:root` at the end of `frontend/styles.css`): gradient Home hero with ripples and an animated wave, nearest-station gradient card, map preview inside the dashboard, rounded station cards, status pills, gradient availability banner on station details, droplet empty states, pulsing "available" map pins, gradient sign-in hero, and a matching admin header. Light theme only; a dark theme is not implemented.

## v6: Flowing Water A brand
- Logo: `logo()` in `frontend/js/core.js` (light and dark palettes) and `frontend/icons/logo.svg`. App icons, maskable icon, Apple touch icon and favicon are generated from the same artwork.
- Loader: `loader()` in `core.js` with CSS under `.aql` in `styles.css` (initial load, route lookup). Respects `prefers-reduced-motion`.


## v7: profile management, tablet/desktop layout
- **Profile page** (`#/account`, the Profile tab): summary card with photo, personal information form (name, email, phone) with **Save changes / Cancel** (Save is enabled only when something changed; unsaved edits survive background refreshes), password change, notification switches, install card and sign out.
- **Profile photo:** Upload / Change / Remove. Choosing a file opens a preview dialog (drag to reposition, zoom slider, keyboard arrows) and the browser uploads a 320 px JPEG, so no extra libraries are needed. The photo shows on the profile card, top bar menu, sidebar, Home greeting and the community feed. If a photo ever fails to load, the initials are shown instead.
  - `PUT /api/me/avatar` (JWT required, only ever changes the signed-in user's own photo): accepts JPG, PNG or WebP up to 500 KB, checks the real file signature (not the claimed type), stores it in the `avatars` table as `<userId>-<random>.<ext>` and saves only the file name in the new `users.avatar` column (added automatically on first start, existing databases are migrated). Replacing or removing a photo deletes the old file.
  - `GET /api/avatars/:file` serves it. File names are random and change on every upload, so they are cached for a year.
  - `userOut` (GET/PUT /api/me, login, register) now includes `avatar` (file name or null) and `since`; `GET /api/community` includes `av`.
  - **Deployment:** photos are stored in the Supabase database (`avatars` table), so no disk or folder is needed and they are backed up with the data.
- **Layouts:** phones are unchanged (bottom tab bar). From 768 px the app fills the window (no phone frame): two-column Home, station cards in a grid, side-by-side station list and map, two-column station details, centred dialogs. From 1024 px a navy sidebar replaces the tab bar (Home, Explore, Stations, Community, Saved, Notifications, AquaBot, Profile, plus your account and Sign out). Sign-in becomes a split screen from 900 px.
- **Station cards** now show the contact number (tap to call) as well as name, address, status, hours and last update. "Low supply" is now orange.
- Tests: `node backend/test/smoke.js` (50 API checks, 17 new for profile/photo) and `cd tests && npm test` (adds `profile.test.js`).


## v8: system console, reviews, report workflow
Built on the Express backend, which now stores its data in Supabase (PostgreSQL) instead of SQLite. The API is unchanged; existing routes behave as before.

**Roles** (`users.role`): `user`, `admin` (manages one station, as before) and the new `superadmin` (whole system). Roles are enforced on the server for every request; `users.active = 0` blocks sign-in and kills existing sessions.
- Dev demo accounts: user@aquafind.com / user123, admin@aquafind.com / admin123, **super@aquafind.com / super123** (created only outside production).
- Production: set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` (10+ chars) before starting. An existing account with that email is promoted instead.

**Users:** star ratings and reviews on every station (one per user, editable, deletable, can be reported to moderators); report status tracking (Pending review / Approved / Rejected / Resolved plus the admin's note) under Community > My history, together with My reviews.

**System console** (`#/admin`, superadmin only): Dashboard (users, stations, available / low / out / closed, pending reports, outdated stations), Stations (add / edit / delete, map with pins, click-to-place location, change availability inline), Availability monitor (statistics, outdated threshold 6 h to 7 d, changes in the last 7 days), Reports (approve / reject / resolve with a note), Reviews (flagged first, hide / restore / delete), Users (search, activate / deactivate, assign role and station; you cannot change your own role or status).

**New API** (all need a token): `GET/PUT/DELETE /api/stations/:id/reviews`, `GET /api/reviews/mine`, `POST /api/reviews/:id/flag`, `PUT /api/reports/:id/status` (superadmin: any station, station admin: own station), `POST/DELETE /api/stations` and `PUT /api/stations/:id` with `lat`/`lng` (superadmin), and `GET /api/superadmin/analytics | availability | users | reports | reviews`, `PUT /api/superadmin/users/:id`, `PUT/DELETE /api/superadmin/reviews/:id`.

**Database:** `schema.sql` creates every table (including `reviews`, `review_flags`, `avatars`) on start, and the old SQLite upgrade steps are gone because a new Supabase database starts on the current schema. To keep existing SQLite data, run `scripts/migrate-sqlite-to-supabase.js` once before the first start (see DEPLOY.md).

**Tests:** `cd backend && node test/smoke.js` (104 API checks), `cd tests && npm test` (jsdom suites), `cd tests && node e2e.v8.js` (browser click-through; needs Playwright with Chromium).
