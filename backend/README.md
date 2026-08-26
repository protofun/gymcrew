# GymCrew backend

A small PHP + MySQL API that stores the "core" real data — profile, workouts, personal records,
body log — for the GymCrew app. No framework, no Composer, no build step: every file here can be
uploaded straight to shared hosting via FTP and it just works.

## Why it looks like this

- **Plain PHP, no framework.** Runs on virtually any Hostinger shared-hosting plan without a Node
  runtime, SSH access, or Composer.
- **JWT verification is hand-written** (`auth.php`), not `firebase/php-jwt`, for the same reason —
  no Composer install step required on the server.
- **JSON columns for workout data** (`exercises_json`, `muscle_intensity_json`, `prs_json`) instead
  of a fully normalized schema — the app never needs to query into individual sets from SQL, so
  normalizing further would just be more tables for no benefit right now.
- **Everything the app stores now syncs.** Profile/onboarding, workouts (including the in-progress
  draft, not just finished ones), PRs, body log, profile level (XP/division), crews, goals,
  currency, cosmetics, split theme, tracked lifts, custom exercises/workouts, favorites, workout
  notes, today's training override, notification read-state, challenges, the crew league, and
  led-workout sessions all sync. The smaller ones share one generic table (`user_state`, see
  `routes/state.php`) instead of a bespoke table each — one row per (user, feature key) holding
  that feature's whole state as JSON. See `db/schema.sql`'s comment above `user_state` for the full
  list of keys.
- **Crews are genuinely shared, not per-account.** `crews`/`crew_members` (see `routes/crews.php`)
  are real relational tables — one row per crew, with a membership row per real account. Two real
  Clerk accounts in the same crew see and edit the *same* row: creating generates a unique invite
  code, joining consumes one, leaving/kicking updates membership for everyone. Challenges, the crew
  league, and led-workout sessions are still per-account only (same caveat as before) — that's the
  next piece of this same work.

## 1. Create the database (Hostinger hPanel)

1. hPanel → **Databases → MySQL Databases** → create a database and a database user, note the
   database name, username, password, and host (usually `localhost`).
2. Open **phpMyAdmin** for that database, go to the **Import** tab, and import `db/schema.sql`.
   You should end up with eight tables: `users`, `workouts`, `personal_records`, `body_log_entries`,
   `profile_level`, `crews`, `crew_members`, `user_state`. (Already imported an earlier version of
   this file? Every statement uses `CREATE TABLE IF NOT EXISTS`, so re-importing the current
   `db/schema.sql` is always safe — it only adds whatever tables are missing, your existing data is
   untouched.)

## 2. Find your Clerk JWKS URL

Clerk Dashboard → **Configure → API Keys** → copy the **Frontend API URL** shown there (something
like `https://your-app-name.clerk.accounts.dev`), then append `/.well-known/jwks.json`. That full
URL is `CLERK_JWKS_URL`.

## 3. Configure

Copy `.env.example` to `.env` in this same folder and fill in `DB_HOST` / `DB_NAME` / `DB_USER` /
`DB_PASS` / `CLERK_JWKS_URL`. Set `CORS_ORIGIN` to the exact URL your PWA is served from once you
know it (e.g. `https://app.yourdomain.com`); `*` is fine while testing locally.

## 4. Upload

Upload the entire contents of this `backend/` folder (via FTP or hPanel's File Manager) to wherever
you want the API to live:

- **Own subdomain (recommended):** create `api.yourdomain.com` pointed at its own document root
  (hPanel → Domains → Subdomains), upload everything there, leave `API_BASE_PATH` empty. The app
  then points at `https://api.yourdomain.com`.
- **Sub-path of your main site:** upload into `public_html/api/`, set `API_BASE_PATH=/api`. The app
  then points at `https://yourdomain.com/api`.

Either way, `.htaccess` already blocks direct access to `.env`, so it's safe for `.env` to sit
alongside the PHP files — you don't need to move it outside the web root.

## 5. Point the app at it

In the Expo app's `.env.local` (repo root, not this folder):

```
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

## 6. Smoke-test

```bash
curl -i https://api.yourdomain.com/profile
# -> 401 {"error":"Missing Authorization header"}  (expected without a token — confirms routing + DB connect work)
```

Getting a real 401 (not a 500 or a blank page) means the DB connection and routing are both fine.
A 500 usually means `.env` values are wrong; check the server's PHP error log in hPanel.

To test with a real token, sign into the app, and temporarily log `await getToken()` from
`@clerk/expo`'s `useAuth()` somewhere, then:

```bash
curl -i https://api.yourdomain.com/profile -H "Authorization: Bearer <token>"
```

## A note on testing

This was written and reviewed carefully, but **not executed** — this sandbox has no PHP, MySQL, or
Docker available to actually run it against a live Clerk instance. Before relying on it, run
`php -l <file>` (syntax check only, no server needed) on each `.php` file if you have PHP installed
locally, and do the curl smoke-test above once it's deployed. If something 500s, the server's PHP
error log (hPanel → Advanced → PHP Error Log-ish, exact name varies by plan) will show the real
cause — flag it back and I'll fix it directly.
