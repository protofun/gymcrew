# GymCrew Admin Panel

A full admin dashboard for GymCrew — users, crews, content reports, a real two-way support chat,
internal notes, an admin task board (Kanban + calendar), a public roadmap, admin-account
management, app-wide announcements, and a drag-and-drop broadcast email builder. Built on
[TailAdmin](https://tailadmin.com/react) (free, MIT-licensed React + Vite + Tailwind CSS admin
template), talking to the same PHP/MySQL backend the app uses (see `../backend/`).

**Other open-source pieces used, all free/MIT:**
- [react-email-editor](https://github.com/unlayer/react-email-editor) — the drag-and-drop email
  builder on the Send Email page (wraps Unlayer's free embeddable editor).
- [dnd-kit](https://github.com/clauderic/dnd-kit) — the drag-and-drop Task board.
- [FullCalendar](https://fullcalendar.io/) (already part of TailAdmin) — the Task board's Calendar view.

This is a **separate static web app** — not part of the Expo app, and not deployed to app stores.
It builds to plain static files (`npm run build` → `dist/`) that you FTP to their own path/subdomain,
same deploy model as the rest of this project (no Node server needed to host it, only to build it
locally first).

## Why a separate app, not a screen inside GymCrew

Admin tools are used on desktop, need their own login (not a Clerk end-user account), and have
nothing to do with what ships to the App Store/Play Store. Keeping it a fully separate static site
avoids bloating the mobile app bundle and keeps admin auth cleanly isolated from end-user auth.

## Analytics & errors

This panel deliberately does **not** duplicate click-tracking, session recording, or crash
reporting — GymCrew already has PostHog and Sentry wired into the app for that (see
`../src/config/posthog.ts` and `../src/config/sentry.ts`). The **Analytics & Errors** page just
links out to those dashboards. Set `VITE_POSTHOG_URL` / `VITE_SENTRY_URL` in `.env.local` to point
the links at your real project dashboards.

## 1. Set up the backend

The admin API lives in `../backend/routes/admin.php`, dispatched from `../backend/index.php` under
the `/admin/*` path — same backend, same deploy, no separate server. Before using the panel:

1. Re-import `../backend/db/schema.sql` via phpMyAdmin — adds `admin_users`, `content_reports.status`,
   `support_messages.status`/`support_replies`, `admin_notes`, `admin_tasks`, `roadmap_items`,
   `users.banned_at`, `crews.disabled_at`, `app_banners`. Safe to re-run, only adds what's
   missing.
2. In the live `backend/.env`, set:
   - `ADMIN_JWT_SECRET` — a long random string (e.g. `php -r "echo bin2hex(random_bytes(32));"`).
     This signs admin login sessions; changing it logs every admin out instantly.
   - `ADMIN_EMAIL_FROM` — the "From" address for broadcast emails (e.g. `noreply@gymcrew.site`),
     needed for the Send Email page.
3. Create the first admin account: temporarily set `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in
   `backend/.env`, then run `backend/scripts/seed-admin.php` once via Hostinger hPanel → Advanced →
   Cron Jobs → **Run Now** (see that script's own doc comment — same pattern as the other one-off
   scripts in `backend/scripts/`). Remove those two env lines afterward if you like; the script
   never logs the plaintext password anywhere.
4. Upload the backend changes (`routes/admin.php`, `routes/push-token.php` if not already live,
   `admin-auth.php`, the updated `index.php`) via FTP, same as always.
5. Set `CLERK_SECRET_KEY` in `backend/.env` too. Passwords and login emails live in Clerk, so
   **Set New Password**, **Sign Out Everywhere** and changing a user's email on their detail page all
   go through Clerk's Backend API — without the key those three buttons show an error (everything
   else, including editing the other profile fields, keeps working). Passwords are write-only: there
   is no way to read one back, and they never touch our database or the audit log.

## 2. Configure and build this app

```bash
cd admin
npm install
cp .env.example .env.local
# Edit .env.local: set VITE_API_BASE_URL to the same backend URL the app uses (e.g.
# https://gymcrew.site/api, no trailing slash).
npm run dev      # local development, http://localhost:5173
npm run build    # production build -> dist/
```

## 3. Deploy

Upload the contents of `dist/` to its own path or subdomain on your Hostinger hosting (e.g.
`admin.gymcrew.site`, or `gymcrew.site/admin/`) — it's a plain static site, no PHP/Node needed to
serve it. If you host it at a sub-path rather than a domain root, you may need a `base` setting in
`vite.config.ts` matching that path before building (see [Vite's deploy docs](https://vite.dev/guide/static-deploy)).

## Login

Sign in at whatever URL you deploy this to, using the admin account created in step 3 above. Add
teammates from the **Admin Management** page once you're in — no need to re-run the seed script for
additional admins.

## What's intentionally out of scope (v1)

- **Editing arbitrary user profile fields.** Only ban/unban and delete — editing someone's weight,
  goals, etc. from an admin panel risks silently corrupting their own data; not worth the risk for
  a feature nobody asked for yet.
- **Per-user notification-preference filtering on broadcast crew-activity pushes** — everyone in a
  crew currently gets notified of every crew moment (same as the in-app feed already shows), since
  those preferences aren't stored server-side yet.
- **Editing `admin-challenges`** (the existing Clerk-authenticated in-app admin flow for app-wide
  challenges, see `../src/app/profile/admin-challenges.tsx`) — that's a separate, pre-existing
  system with its own auth (a hardcoded email allowlist checked against a Clerk session), not yet
  folded into this panel.
