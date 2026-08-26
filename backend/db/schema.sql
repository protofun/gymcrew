-- GymCrew backend schema. Import via phpMyAdmin (or `mysql < schema.sql`) on the database
-- you created in Hostinger's hPanel. Safe to re-run: every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,   -- Clerk user id (the JWT `sub` claim)
  email VARCHAR(255) NULL,
  full_name VARCHAR(255) NULL,
  gender ENUM('male', 'female') NULL,
  height_cm INT NULL,
  weight_kg DECIMAL(5,2) NULL,
  age INT NULL,
  gym_name VARCHAR(255) NULL,
  goal VARCHAR(255) NULL,
  experience_level VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  icon VARCHAR(64) NOT NULL DEFAULT 'gorilla',
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
  CONSTRAINT fk_crews_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
