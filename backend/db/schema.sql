-- GymCrew backend schema. Import via phpMyAdmin (or `mysql < schema.sql`) on the database
-- you created in Hostinger's hPanel. Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,   -- Clerk user id (the JWT `sub` claim)
  email VARCHAR(255) NULL,
  full_name VARCHAR(255) NULL,
  username VARCHAR(32) NULL,             -- lowercase, unique when set — see routes/profile.php
  avatar_url VARCHAR(512) NULL,          -- Clerk-hosted photo (own upload or generated) — see routes/profile.php
  gender ENUM('male', 'female') NULL,
  height_cm INT NULL,
  weight_kg DECIMAL(5,2) NULL,
  age INT NULL,
  gym_name VARCHAR(255) NULL,
  goal VARCHAR(255) NULL,
  experience_level VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before `username`/`avatar_url` existed on `users` — CREATE TABLE IF
-- NOT EXISTS above only fires on a brand-new database, it doesn't add a column to a table that
-- already exists. These are no-ops (via IF NOT EXISTS) on both a fresh install (already created
-- above) and an already-upgraded one, so it's safe for this whole file to keep being re-imported as
-- one script, same as the README promises. Needs MySQL 8.0.29+ for `ADD ... IF NOT EXISTS`; on an
-- older server, run these by hand once instead (phpMyAdmin -> SQL tab) with that clause removed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32) NULL AFTER full_name;
ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uniq_users_username (username);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL AFTER username;

-- One row per completed workout. `exercises_json` / `muscle_intensity_json` / `prs_json` mirror the
-- app's CompletedWorkout shape exactly (LoggedExercise[], Partial<Record<MuscleGroup,number>>,
-- WorkoutPr[]) — stored as JSON rather than normalized into more tables, since nothing on the
-- backend needs to query into individual sets yet. Revisit if that changes.
CREATE TABLE IF NOT EXISTS workouts (
  id VARCHAR(64) NOT NULL PRIMARY KEY,   -- client-generated id, same one the app already uses locally
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  completed_at BIGINT NOT NULL,          -- epoch milliseconds, matches CompletedWorkout.completedAt
  duration_seconds INT NOT NULL DEFAULT 0,
  unit VARCHAR(8) NOT NULL DEFAULT 'kg',
  notes TEXT NULL,
  volume_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
  completed_sets INT NOT NULL DEFAULT 0,
  exercises_json JSON NOT NULL,
  muscle_intensity_json JSON NOT NULL,
  prs_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workouts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_workouts_user_date (user_id, completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Current best per exercise, same "heaviest completed set ever logged" shape as the live
-- personal-records-store. Keyed by (user_id, exercise_id) since there's only ever one current best.
CREATE TABLE IF NOT EXISTS personal_records (
  user_id VARCHAR(64) NOT NULL,
  exercise_id VARCHAR(128) NOT NULL,
  exercise_name VARCHAR(255) NOT NULL,
  best_weight_kg DECIMAL(6,2) NOT NULL,
  best_reps INT NOT NULL,
  achieved_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, exercise_id),
  CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only log of every new PR ever set, per exercise — unlike `personal_records` above (which
-- only ever holds the CURRENT best and gets overwritten), a row here is written once and never
-- touched again. Powers the Ranks tab's real per-lift "Rank History" timeline (see
-- src/lib/rank-history.ts) with genuine historical PR dates instead of an invented climb. Starts
-- empty and only grows from the moment this shipped — a PR set before that only exists as the one
-- row in `personal_records` above, which the client still shows as the single most-recent milestone.
CREATE TABLE IF NOT EXISTS personal_record_history (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  exercise_id VARCHAR(128) NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  reps INT NOT NULL,
  achieved_at BIGINT NOT NULL,
  CONSTRAINT fk_recordhistory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recordhistory_user_exercise (user_id, exercise_id, achieved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS body_log_entries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  logged_at BIGINT NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  body_fat_percent DECIMAL(4,2) NULL,
  CONSTRAINT fk_bodylog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bodylog_user_date (user_id, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dedicated table for personal level/rank — pulled out of the generic user_state blob below
-- specifically so it's directly visible/queryable in phpMyAdmin (not hidden inside a JSON blob).
-- Written/read by backend/routes/profile_level.php via GET/PUT /profile-level.
CREATE TABLE IF NOT EXISTS profile_level (
  user_id VARCHAR(64) NOT NULL PRIMARY KEY,
  xp INT NOT NULL DEFAULT 0,
  division VARCHAR(32) NOT NULL DEFAULT 'Rookie',
  division_history_json JSON NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT fk_profilelevel_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Real, genuinely shared crews — multiple real Clerk accounts belong to the SAME row here (via
-- crew_members below), unlike the old per-account "crew" state_key this replaces. One row per
-- crew, not per member. Written/read by backend/routes/crews.php.
CREATE TABLE IF NOT EXISTS crews (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(255) NOT NULL DEFAULT '',
  -- Either a preset key (see data/crew-icons.ts's CREW_ICONS) or a full DiceBear URL from the
  -- in-app generator (see CrewAvatarGeneratorModal) — wide enough for either.
  icon VARCHAR(512) NOT NULL DEFAULT 'gorilla',
  training_type VARCHAR(255) NOT NULL DEFAULT '',
  privacy ENUM('invite-only', 'open', 'public') NOT NULL DEFAULT 'invite-only',
  join_requests_enabled TINYINT(1) NOT NULL DEFAULT 1,
  max_members INT NOT NULL DEFAULT 8,
  invite_code VARCHAR(16) NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  division VARCHAR(32) NOT NULL DEFAULT 'Rookie',
  division_history_json JSON NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_crews_invite_code (invite_code),
  UNIQUE KEY uniq_crews_name (name),
  CONSTRAINT fk_crews_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before crew names were required to be unique — see the `username`
-- upgrade note above `users` for why CREATE TABLE IF NOT EXISTS alone doesn't cover this, and why
-- re-running this whole file is still always safe. If this specific line ever fails on an existing
-- database, it means two crews already share a name (case-insensitively) — rename one manually first.
ALTER TABLE crews ADD UNIQUE KEY IF NOT EXISTS uniq_crews_name (name);

-- Widens `icon` on a database created before it needed to fit a DiceBear URL, not just a short
-- preset key — MODIFY COLUMN has no IF NOT EXISTS form, but re-running the same target width is
-- always a harmless no-op, so this is safe to keep in this always-safe-to-re-import file too.
ALTER TABLE crews MODIFY COLUMN icon VARCHAR(512) NOT NULL DEFAULT 'gorilla';

-- Membership rows linking real accounts to a crew. A real account can only be in one crew at a
-- time (uniq_crewmembers_user below) — matches the app's UI, which only ever shows "your crew"
-- (singular). Deleting the row here is how leaving/kicking works; deleting the crew itself cascades
-- and removes every member row.
CREATE TABLE IF NOT EXISTS crew_members (
  crew_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role ENUM('leader', 'co-leader', 'member') NOT NULL DEFAULT 'member',
  joined_at BIGINT NOT NULL,
  PRIMARY KEY (crew_id, user_id),
  UNIQUE KEY uniq_crewmembers_user (user_id),
  CONSTRAINT fk_crewmembers_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_crewmembers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Crews waiting to be matched into a War. A row here means "looking for an opponent" — matching
-- happens synchronously in backend/routes/crew-wars.php right when a crew joins (no cron job in
-- this setup), so a row's lifetime is normally seconds, not the "queue" you might expect.
CREATE TABLE IF NOT EXISTS crew_war_queue (
  crew_id VARCHAR(64) NOT NULL PRIMARY KEY,
  crew_power INT NOT NULL,           -- snapshot at queue time, for pairing similarly-strong crews
  queued_at BIGINT NOT NULL,
  CONSTRAINT fk_warqueue_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A real crew-vs-crew battle: two genuinely different crews, real member contributions, resolved
-- by total volume once `ends_at` passes. Unlike the old fake "Challenge Another Crew" flow (whose
-- opponent numbers were a deterministic hash, see src/lib/challenge-progress.ts), both sides here
-- are real crews with real scores. Resolution is lazy — checked and applied the next time either
-- side's app reads /crew-wars/active, same "resolve on next read" pattern as everything else here.
CREATE TABLE IF NOT EXISTS crew_wars (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  crew_a_id VARCHAR(64) NOT NULL,
  crew_b_id VARCHAR(64) NOT NULL,
  crew_a_score DECIMAL(12,2) NOT NULL DEFAULT 0,   -- total kg volume contributed
  crew_b_score DECIMAL(12,2) NOT NULL DEFAULT 0,
  started_at BIGINT NOT NULL,
  ends_at BIGINT NOT NULL,
  status ENUM('active', 'completed') NOT NULL DEFAULT 'active',
  winner_crew_id VARCHAR(64) NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_wars_crew_a FOREIGN KEY (crew_a_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_wars_crew_b FOREIGN KEY (crew_b_id) REFERENCES crews(id) ON DELETE CASCADE,
  INDEX idx_wars_crew_a (crew_a_id, status),
  INDEX idx_wars_crew_b (crew_b_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only per-workout contribution toward a War, so the leaderboard of "who's carrying the
-- crew this war" can be shown, not just the aggregate score on crew_wars itself.
CREATE TABLE IF NOT EXISTS crew_war_contributions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  war_id VARCHAR(64) NOT NULL,
  crew_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  volume_kg DECIMAL(10,2) NOT NULL,
  contributed_at BIGINT NOT NULL,
  CONSTRAINT fk_warcontrib_war FOREIGN KEY (war_id) REFERENCES crew_wars(id) ON DELETE CASCADE,
  INDEX idx_warcontrib_war_user (war_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only feed of crewmate motivational moments (PR / streak milestone / long session /
-- division up). `payload_json` shape depends on event_type — see backend/routes/crew-activity-events.php.
-- This is the real, timestamped activity feed src/lib/notifications.ts explicitly said didn't
-- exist yet ("No fabricated crew/social events, since there's no real timestamped activity feed
-- to draw those from yet") — this table is that feed.
CREATE TABLE IF NOT EXISTS crew_activity_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  crew_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  event_type ENUM('pr', 'streak', 'long_session', 'division_up') NOT NULL,
  payload_json JSON NOT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_crewevents_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  INDEX idx_crewevents_crew_date (crew_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A lightweight 1-on-1 "who does more today" challenge between two crewmates. Resolved lazily
-- (same pattern as crew_wars) by comparing each side's real workouts for target_date_key once
-- that date has passed.
CREATE TABLE IF NOT EXISTS crew_duels (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  crew_id VARCHAR(64) NOT NULL,
  challenger_id VARCHAR(64) NOT NULL,
  opponent_id VARCHAR(64) NOT NULL,
  metric ENUM('volume', 'sets') NOT NULL,
  target_date_key VARCHAR(10) NOT NULL,   -- yyyy-mm-dd
  status ENUM('pending', 'accepted', 'declined', 'completed') NOT NULL DEFAULT 'pending',
  winner_id VARCHAR(64) NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_duels_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_duels_challenger FOREIGN KEY (challenger_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_duels_opponent FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_duels_crew_date (crew_id, target_date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- App-wide challenges curated by hand (see routes/admin-challenges.php — write access is gated to
-- one hardcoded admin email, not a real roles system) instead of the procedurally-picked weekly pool
-- (data/challenges.ts). Visible to every crew once `is_active`, same shape/behavior as a weekly
-- challenge (progress tracked, XP/token reward on completion) — just admin-authored and left running
-- until manually stopped instead of rotating weekly.
CREATE TABLE IF NOT EXISTS admin_challenges (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  metric_json JSON NOT NULL,
  unit VARCHAR(32) NOT NULL,
  per_member_target INT NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'flag-outline',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  -- Marks a challenge as part of the GymCrew Summer Challenge event (see ChallengesTab) — shown in
  -- its own section, locked/read-only until the app's real release instead of counting progress.
  is_summer_challenge TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT fk_adminchallenges_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before `is_summer_challenge` existed — see the `username` upgrade note
-- above `users` for why this is needed alongside CREATE TABLE IF NOT EXISTS, and why it's safe to
-- keep re-running this whole file.
ALTER TABLE admin_challenges ADD COLUMN IF NOT EXISTS is_summer_challenge TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

-- Generic per-user JSON blob storage: ONE table that holds several smaller features' worth of
-- data, one ROW per (user, state_key) pair — not one row total. In phpMyAdmin, browse this table
-- and you'll see one row per user per state_key below, each with its own JSON payload. None of
-- these need server-side querying/filtering the way `workouts` benefits from `ORDER BY
-- completed_at`, so one shared table is simpler to build and maintain than a bespoke one each.
-- Written/read by backend/routes/state.php via GET/PUT /state/:key.
--
-- state_key values actually written by the app today (see src/store/*.ts for each one's exact
-- JSON shape):
--   'active-workout'    — store/active-workout-store.ts (the in-progress workout draft, if any —
--                          resumable from another device/after a reload, not just this one's cache)
--   'goals'             — store/goals-store.ts        (personal goals list)
--   'currency'          — store/currency-store.ts      (tokens, streak freezes, XP boost)
--   'cosmetics'         — store/cosmetics-store.ts     (owned/equipped Flex Tags)
--   'theme'             — store/theme-store.ts         (split accent theme, purchased themes)
--   'tracked-lifts'     — store/tracked-lifts-store.ts (custom/removed lift cards on Ranks)
--   'custom-exercises'  — store/custom-exercises-store.ts
--   'custom-workouts'   — store/custom-workouts-store.ts
--   'favorite-exercises'— store/favorite-exercises-store.ts
--   'workout-notes'     — store/workout-notes-store.ts (per-session notes)
--   'today-training'    — store/today-training-store.ts (today's schedule override)
--   'notifications'     — store/notifications-store.ts (read/unread ids)
--   'onboarding-full'   — store/onboarding-store.ts    (every wizard answer, not just the
--                          subset that's also broken out into columns on `users` above)
--   'challenges'        — store/challenge-store.ts     (weekly + custom Battle challenge progress)
--   'crew-league'       — store/crew-league-store.ts   (weekly league standings history)
--   'led-workout'       — store/led-workout-store.ts   ("join a live workout" session)
--
-- IMPORTANT about the last three: same "per-account own view, not yet genuinely shared" caveat
-- that used to apply to crew too (see crews/crew_members above, which now IS genuinely shared).
-- These three still aren't — a real multi-account challenge/league/live-workout system is its own
-- follow-up piece of work, same shape as the crew one just built.
CREATE TABLE IF NOT EXISTS user_state (
  user_id VARCHAR(64) NOT NULL,
  state_key VARCHAR(64) NOT NULL,
  data_json JSON NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, state_key),
  CONSTRAINT fk_userstate_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
