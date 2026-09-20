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
  -- Set once, the moment this account's email is first seen to match a marketing-site
  -- founding_athletes row (see routes/profile.php's maybeLinkFoundingAthlete) — doubles as both the
  -- link and the "is this a Founding Athlete" flag (non-null = yes). Never re-checked once set.
  founding_athlete_id VARCHAR(64) NULL,
  -- This device's Expo push token (see lib/push-notifications.ts) — only ever set server-side from
  -- routes/push-token.php, keyed off the JWT-verified caller, same "never trust client identity
  -- fields" rule as email. One token per account (last device to register wins); good enough until
  -- multi-device push is worth the extra table.
  expo_push_token VARCHAR(255) NULL,
  -- Set by the admin panel (see routes/admin.php) to soft-ban an account — non-null means banned.
  -- Kept as a timestamp (not a plain boolean) so "since when" is always visible without a second
  -- column, same convention as founding_athlete_id above.
  banned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_users_username (username),
  UNIQUE KEY uniq_users_founding_athlete (founding_athlete_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before `username`/`avatar_url`/`founding_athlete_id` existed on
-- `users` — CREATE TABLE IF NOT EXISTS above only fires on a brand-new database, it doesn't add a
-- column to a table that already exists. These are no-ops (via IF NOT EXISTS) on both a fresh
-- install (already created above) and an already-upgraded one, so it's safe for this whole file to
-- keep being re-imported as one script, same as the README promises. Needs MySQL 8.0.29+ for
-- `ADD ... IF NOT EXISTS`; on an older server, run these by hand once instead (phpMyAdmin -> SQL
-- tab) with that clause removed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32) NULL AFTER full_name;
ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uniq_users_username (username);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) NULL AFTER username;
ALTER TABLE users ADD COLUMN IF NOT EXISTS founding_athlete_id VARCHAR(64) NULL AFTER experience_level;
ALTER TABLE users ADD UNIQUE KEY IF NOT EXISTS uniq_users_founding_athlete (founding_athlete_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255) NULL AFTER founding_athlete_id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at DATETIME NULL AFTER expo_push_token;

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

-- True when logged via "Log a Past Workout" for an earlier day rather than the day it was actually
-- entered. Every point-earning computation (streaks, crew challenges/league, PRs) excludes these
-- client-side (see src/lib/streak.ts, crew-league.ts, challenge-progress.ts) — PRs never even reach
-- this table's prs_json / personal_records for a backfilled workout, since active.tsx skips the
-- check entirely, so backfilling can't be used to fabricate rank.
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_backfilled TINYINT(1) NOT NULL DEFAULT 0;

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

-- A user's own progress photos (front/side/back), captured with an on-screen alignment guide (see
-- components/PhotoCaptureGuide.tsx) so any two can later be overlaid to make gradual physique change
-- visible (components/ProgressPhotoOverlay.tsx) instead of relying on day-to-day memory. `photo_url`
-- points at an uploaded file, same storage/URL pattern as crew icons and food photos (see
-- saveUploadedImage in config.php).
CREATE TABLE IF NOT EXISTS progress_photos (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  pose VARCHAR(32) NOT NULL,
  photo_url VARCHAR(512) NOT NULL,
  captured_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_progressphoto_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_progressphoto_user_pose_date (user_id, pose, captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A user's saved meal or shake — a reusable combination of foods, one tap away from being logged
-- (see NUTRITION.md section 14-18). `items_json` mirrors `workouts.exercises_json`'s precedent:
-- one JSON array of ingredient snapshots (name, per-serving macros, quantity), not a normalized
-- meal_items table, since nothing on the backend needs to query into individual ingredients.
-- Snapshotting each item's macros at add-time (rather than joining a live foods row) means a saved
-- meal's totals never silently drift if the underlying food is later edited or deleted — same
-- reasoning as `food_logs` below. `total_*` columns are precomputed client-side and stored
-- redundantly (like `workouts.volume_kg`) so My Meals/My Shakes can render totals without
-- re-summing JSON.
CREATE TABLE IF NOT EXISTS meals (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  kind ENUM('meal', 'shake') NOT NULL DEFAULT 'meal',
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  items_json JSON NOT NULL,
  total_calories DECIMAL(7,2) NOT NULL DEFAULT 0,
  total_protein_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_carbs_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  total_fat_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CONSTRAINT fk_meals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_meals_user_kind (user_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per logged food/meal/shake in a user's daily food log (see NUTRITION.md section 3, 35).
-- `name`/`calories`/`protein_g`/`carbs_g`/`fat_g` are a snapshot at the moment of logging (same
-- "never retroactively changes" reasoning as `meals.items_json` above) — editing or deleting the
-- source food/meal later never rewrites a day that's already in the books. `food_id`/`meal_id` are
-- kept only as an optional back-reference (e.g. "log this again"), hence ON DELETE SET NULL rather
-- than CASCADE. Foods themselves have no backend table yet — Phase 1 keeps the food library
-- client-side (src/data/nutrition-foods.ts + the user's own custom foods, synced the same way
-- custom-exercises are), same reasoning `custom_exercises` never got a table either. `food_id` is
-- therefore just an opaque id from that client-side world, not a real FK.
CREATE TABLE IF NOT EXISTS food_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  food_id VARCHAR(64) NULL,
  meal_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  meal_slot ENUM('breakfast', 'lunch', 'dinner', 'snacks') NOT NULL DEFAULT 'snacks',
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  unit VARCHAR(16) NOT NULL DEFAULT 'g',
  calories DECIMAL(7,2) NOT NULL,
  protein_g DECIMAL(6,2) NOT NULL,
  carbs_g DECIMAL(6,2) NOT NULL,
  fat_g DECIMAL(6,2) NOT NULL,
  date_key VARCHAR(10) NOT NULL,
  logged_at BIGINT NOT NULL,
  CONSTRAINT fk_foodlogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_foodlogs_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL,
  INDEX idx_foodlogs_user_date (user_id, date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A shared (not per-user) cache of normalized Open Food Facts products — Level 5/6 of the food
-- database priority (see NUTRITION.md section 34). Never queried by the client directly: the
-- client only ever hits GymCrew's own foods (bundled + custom, client-side — see
-- src/data/nutrition-foods.ts) first, and this cache/Open Food Facts second, via
-- backend/routes/nutrition-off.php. Caching here (rather than re-querying OFF on every search)
-- is what keeps the app fast and within OFF's rate limits, per that section's explicit warning
-- against uncontrolled search-as-you-type against the live API. `raw_json` keeps the untouched OFF
-- response around for future re-normalization without a second network call.
CREATE TABLE IF NOT EXISTS off_products_cache (
  barcode VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NULL,
  serving_size DECIMAL(8,2) NOT NULL DEFAULT 100,
  serving_unit VARCHAR(16) NOT NULL DEFAULT 'g',
  calories DECIMAL(7,2) NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  fat_g DECIMAL(6,2) NOT NULL DEFAULT 0,
  fiber_g DECIMAL(6,2) NULL,
  sugar_g DECIMAL(6,2) NULL,
  saturated_fat_g DECIMAL(6,2) NULL,
  sodium_mg DECIMAL(7,2) NULL,
  photo_url VARCHAR(512) NULL,
  raw_json JSON NULL,
  fetched_at BIGINT NOT NULL,
  INDEX idx_offcache_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before `photo_url` existed on `off_products_cache` — see the
-- `username` upgrade note above `users` for why this is needed alongside CREATE TABLE IF NOT
-- EXISTS, and why it's safe to keep re-running this whole file.
ALTER TABLE off_products_cache ADD COLUMN IF NOT EXISTS photo_url VARCHAR(512) NULL AFTER sodium_mg;

-- Daily water intake — a near-universal food-logger feature (MyFitnessPal, Cronometer, Lifesum all
-- have it). Same "flat log, snapshot at write time" shape as `food_logs` — one row per quick-add tap,
-- not one running total per day, so undoing the last tap is just deleting the most recent row.
CREATE TABLE IF NOT EXISTS water_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  amount_ml INT NOT NULL,
  date_key VARCHAR(10) NOT NULL,
  logged_at BIGINT NOT NULL,
  CONSTRAINT fk_waterlogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_waterlogs_user_date (user_id, date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per AI meal-photo scan (see routes/nutrition-photo-scan.php) — only there to enforce the
-- per-user daily scan limit, since the free Gemini quota is shared by every user of the app. The
-- photo itself is never stored, only the fact that a scan happened.
CREATE TABLE IF NOT EXISTS meal_photo_scans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  scanned_at BIGINT NOT NULL,
  CONSTRAINT fk_mealscans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mealscans_user_time (user_id, scanned_at)
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
  -- Set only when this real crew was auto-created from a marketing-site founding_crews row (see
  -- routes/profile.php's maybeLinkFoundingAthlete) — lets a second, third, etc. Founding Athlete
  -- from that same pre-launch crew land in this SAME real crew instead of each minting their own.
  founding_crew_id VARCHAR(64) NULL,
  -- Set by the admin panel (see routes/admin.php) to hide a crew without hard-deleting it —
  -- members keep their data, the crew just stops showing up as active. Non-null means disabled,
  -- same convention as users.banned_at.
  disabled_at DATETIME NULL,
  -- When true (default), this crew is auto-entered into a new War the moment it has none (see
  -- routes/crew-wars.php's getOrStartWar) — the original always-on behavior. When a leader/co-leader
  -- turns this off (see crews.php's updateCrew), the crew sits without a War until someone on it
  -- taps "Start War" — a real, member-triggered request for a match right now (POST
  -- /crew-wars/start), not a passive thing that just happens to them.
  war_auto_match_enabled TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uniq_crews_invite_code (invite_code),
  UNIQUE KEY uniq_crews_name (name),
  UNIQUE KEY uniq_crews_founding_crew (founding_crew_id),
  CONSTRAINT fk_crews_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Upgrades a database created before crew names were required to be unique — see the `username`
-- upgrade note above `users` for why CREATE TABLE IF NOT EXISTS alone doesn't cover this, and why
-- re-running this whole file is still always safe. If this specific line ever fails on an existing
-- database, it means two crews already share a name (case-insensitively) — rename one manually first.
ALTER TABLE crews ADD UNIQUE KEY IF NOT EXISTS uniq_crews_name (name);

ALTER TABLE crews ADD COLUMN IF NOT EXISTS founding_crew_id VARCHAR(64) NULL AFTER created_at;
ALTER TABLE crews ADD UNIQUE KEY IF NOT EXISTS uniq_crews_founding_crew (founding_crew_id);
ALTER TABLE crews ADD COLUMN IF NOT EXISTS disabled_at DATETIME NULL AFTER founding_crew_id;
ALTER TABLE crews ADD COLUMN IF NOT EXISTS war_auto_match_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER disabled_at;

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

-- Idempotency ledger for crew XP grants (see routes/crews.php's handleCrewXpAward) — any crew
-- member's device can independently detect a challenge/battle completion and report it, so the
-- same completion could otherwise be reported once per member and multiply the XP. `award_key` is
-- a stable id for "this specific completion" (e.g. a weekly-challenge instance id, or
-- "<battleId>:battle-win"); the UNIQUE key means only the first report for a given (crew, award)
-- pair actually applies, every later one is a harmless no-op.
CREATE TABLE IF NOT EXISTS crew_xp_awards (
  crew_id VARCHAR(64) NOT NULL,
  award_key VARCHAR(191) NOT NULL,
  amount INT NOT NULL,
  awarded_by VARCHAR(64) NOT NULL,
  awarded_at BIGINT NOT NULL,
  PRIMARY KEY (crew_id, award_key),
  CONSTRAINT fk_crewxpawards_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A synthetic account existing purely to satisfy `crews.created_by`'s FK for the bot crews seeded
-- below — never a real login, never surfaced anywhere a real user's own account would be (no
-- crew_members row exists for it, which is what keeps every bot crew invisible to member-scoped
-- queries like findMyCrewId or /crews/mine, with no extra filtering needed anywhere).
INSERT IGNORE INTO users (id, full_name) VALUES ('bot-system', 'GymCrew');

-- Permanent illustrative "bot" opponent crews for Crew War (see crew_wars below) — real rows so
-- `crew_wars.crew_b_id`'s FK is satisfied and a War (plus its attack log) is genuinely persisted,
-- never computed client-side. Same names the Weekly League already shows as illustrative rivals
-- (src/data/crew-leaderboard.ts's OTHER_CREWS_POWER) so a crew's War opponent reads as the same
-- "known rival" it already sees there — spread across divisions so real crews at very different
-- strengths still get a same-ish-division match (see crew-wars.php's nearest-division pick).
INSERT IGNORE INTO crews (id, name, tagline, icon, division, xp, division_history_json, invite_code, created_by, created_at) VALUES
  ('bot-crew-beast-mode', 'Beast Mode', 'Always training. Always watching.', 'tiger', 'Rookie', 200, '[]', 'BOT-BEASTMODE', 'bot-system', 0),
  ('bot-crew-iron-addicts', 'Iron Addicts', 'One more rep. Always one more.', 'elephant', 'Bronze', 1200, '[]', 'BOT-IRONADDICT', 'bot-system', 0),
  ('bot-crew-gym-kings', 'Gym Kings', 'We run this floor.', 'dumbbell', 'Silver', 2800, '[]', 'BOT-GYMKINGS', 'bot-system', 0),
  ('bot-crew-lifting-legends', 'Lifting Legends', 'History in the making.', 'cat-yellow', 'Gold', 5200, '[]', 'BOT-LIFTLEGEND', 'bot-system', 0),
  ('bot-crew-reps-over-rest', 'Reps Over Rest', 'Sleep is for rest days.', 'cat-green', 'Platinum', 9000, '[]', 'BOT-REPSOVREST', 'bot-system', 0),
  ('bot-crew-muscle-mafia', 'Muscle Mafia', 'You don''t leave this crew undefeated.', 'cat-red', 'Diamond', 14000, '[]', 'BOT-MUSCLEMAFI', 'bot-system', 0),
  ('bot-crew-no-days-off', 'No Days Off', 'Every single day. No exceptions.', 'cat-brown', 'Champion', 21000, '[]', 'BOT-NODAYSOFF', 'bot-system', 0),
  ('bot-crew-titan-forge', 'Titan Forge', 'Forged, not born.', 'cat-coral', 'Titan', 30000, '[]', 'BOT-TITANFORGE', 'bot-system', 0);

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

-- Superseded by crew_war_attacks below (kept, unused, same non-destructive precedent as the old
-- `led-workout` user_state key — see that comment further down).
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

-- One row per War "attack" — every completed workout during an active War, on either side,
-- real or bot. This is the actual attack feed (see CrewWarTab's attack log), not just a running
-- tally: `score` is stored (not recomputed from volume_kg/pr_count later) so past attacks stay
-- stable even if the scoring formula changes. `user_id` is NULL for a bot attack — bot crews have
-- no real member rows to reference, so the attacker's display name is stored directly instead.
-- Bot attacks are generated lazily on read (see crew-wars.php), same "resolve on next read, no
-- cron" pattern crew_duels already uses — but written here as real rows, not recomputed per-view.
CREATE TABLE IF NOT EXISTS crew_war_attacks (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  war_id VARCHAR(64) NOT NULL,
  crew_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NULL,
  attacker_name VARCHAR(255) NOT NULL,
  workout_name VARCHAR(255) NULL,
  volume_kg DECIMAL(10,2) NOT NULL,
  pr_count INT NOT NULL DEFAULT 0,
  score DECIMAL(10,2) NOT NULL,
  attacked_at BIGINT NOT NULL,
  CONSTRAINT fk_warattacks_war FOREIGN KEY (war_id) REFERENCES crew_wars(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_warattacks_bot_slot (war_id, crew_id, attacked_at),
  INDEX idx_warattacks_war_time (war_id, attacked_at)
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

-- One row per (event, user, emoji) tap-react — see routes/crew-activity-events.php. Slack-style: a
-- user can react to the same event with more than one emoji, but reacting again with the same emoji
-- removes it (the unique key below is what makes that a toggle instead of a duplicate insert).
CREATE TABLE IF NOT EXISTS crew_activity_reactions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  emoji VARCHAR(8) NOT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_crewreactions_event FOREIGN KEY (event_id) REFERENCES crew_activity_events(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_crewreactions_event_user_emoji (event_id, user_id, emoji),
  INDEX idx_crewreactions_event (event_id)
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

-- A crew's real, currently-in-progress workout — one row per active session, genuinely shared
-- (every crew member polls/reads the same row), replacing the old per-account `led-workout` blob
-- below. See backend/routes/crew-live-sessions.php.
CREATE TABLE IF NOT EXISTS crew_live_sessions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  crew_id VARCHAR(64) NOT NULL,
  leader_id VARCHAR(64) NOT NULL,
  workout_name VARCHAR(255) NOT NULL,
  exercises_json JSON NOT NULL,
  participant_ids_json JSON NOT NULL,
  started_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  ended_at BIGINT NULL,
  CONSTRAINT fk_crewlive_crew FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_crewlive_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_crewlive_crew_active (crew_id, ended_at)
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
--   'custom-foods'      — store/custom-foods-store.ts  (user-created foods, same pattern as
--                          'custom-exercises' above)
--   'favorite-foods'    — store/favorite-foods-store.ts (starred food ids, same pattern as
--                          'favorite-exercises' above)
--   'nutrition-targets' — store/nutrition-targets-store.ts (daily calorie/macro targets + goal)
--
-- IMPORTANT about the last two: same "per-account own view, not yet genuinely shared" caveat that
-- used to apply to crew (and to live-workout sessions) too — see crews/crew_members above, and
-- crew_live_sessions below, both now genuinely shared. Challenges/league aren't yet — a real
-- multi-account version of those is its own follow-up piece of work, same shape as those two.
CREATE TABLE IF NOT EXISTS user_state (
  user_id VARCHAR(64) NOT NULL,
  state_key VARCHAR(64) NOT NULL,
  data_json JSON NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, state_key),
  CONSTRAINT fk_userstate_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Public waitlist signups from the marketing landing page (landingpage/GymCrew Landing
-- (standalone).html) — deliberately NOT tied to `users`: a visitor joining the waitlist has no
-- account yet (that's the whole point of a pre-launch waitlist). Written by the one public,
-- no-auth route this backend has besides username-available — see routes/waitlist.php.
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  source VARCHAR(64) NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_waitlist_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pre-launch "Founding Athlete" signups from the marketing site's dedicated signup page
-- (landingpage/athlete-signup.html) — a real account (email + password), separate from the real
-- app's `users` table since these people have no Clerk account yet. `email` is the field a future
-- "claim your Founding Athlete badge" step in the real app would join on. See
-- routes/athlete-signup.php.
CREATE TABLE IF NOT EXISTS founding_athletes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(32) NOT NULL,
  profile_picture_url VARCHAR(512) NULL,
  auth_token VARCHAR(128) NOT NULL,
  -- The matching real Clerk user, created via Clerk's Backend API the moment this row is (see
  -- routes/athlete-signup.php's createClerkUserForFoundingAthlete) — lets /athlete-app-link mint a
  -- sign-in ticket so opening the app signs this same account straight in, no second signup, no
  -- re-entering credentials. NULL if that Backend API call wasn't configured (CLERK_SECRET_KEY) or
  -- failed — never blocks the marketing-site signup itself either way.
  clerk_user_id VARCHAR(64) NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_foundingathletes_email (email),
  UNIQUE KEY uniq_foundingathletes_username (username),
  UNIQUE KEY uniq_foundingathletes_token (auth_token),
  UNIQUE KEY uniq_foundingathletes_clerk_user (clerk_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE founding_athletes ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(64) NULL AFTER auth_token;
ALTER TABLE founding_athletes ADD UNIQUE KEY IF NOT EXISTS uniq_foundingathletes_clerk_user (clerk_user_id);

-- One pre-launch Crew per Founding Athlete, created in the same signup flow. Separate from the
-- real app's `crews` table for the same reason as founding_athletes above.
CREATE TABLE IF NOT EXISTS founding_crews (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  athlete_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  logo_url VARCHAR(512) NULL,
  invite_code VARCHAR(16) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_foundingcrews_athlete (athlete_id),
  UNIQUE KEY uniq_foundingcrews_name (name),
  UNIQUE KEY uniq_foundingcrews_invite_code (invite_code),
  CONSTRAINT fk_foundingcrews_athlete FOREIGN KEY (athlete_id) REFERENCES founding_athletes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A regular member of someone else's founding_crews row — created by a visitor who registers
-- through an invite link (landingpage/join.html -> POST /athlete-join) rather than by creating
-- their own crew. The crew's own leader is NOT duplicated in here — founding_crews.athlete_id
-- already is the leader; a crew's full roster is that leader plus every row here for its id.
-- uniq_foundingcrewmembers_athlete keeps membership 1-crew-per-athlete, mirroring the 1-crew-per-
-- leader constraint above.
CREATE TABLE IF NOT EXISTS founding_crew_members (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  crew_id VARCHAR(64) NOT NULL,
  athlete_id VARCHAR(64) NOT NULL,
  joined_at BIGINT NOT NULL,
  UNIQUE KEY uniq_foundingcrewmembers_athlete (athlete_id),
  KEY idx_foundingcrewmembers_crew (crew_id),
  CONSTRAINT fk_foundingcrewmembers_crew FOREIGN KEY (crew_id) REFERENCES founding_crews(id) ON DELETE CASCADE,
  CONSTRAINT fk_foundingcrewmembers_athlete FOREIGN KEY (athlete_id) REFERENCES founding_athletes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User-generated-content reports (a Crew's name/icon, or a specific member) — see
-- routes/reports.php. Append-only, same shape as crew_activity_events. Reviewed from the admin
-- panel now (see routes/admin.php) — `status` tracks whether that's happened yet.
-- reporter_user_id is always the JWT-verified caller (never trust a client-supplied id here, same
-- lesson as profile.php's email fix).
CREATE TABLE IF NOT EXISTS content_reports (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reporter_user_id VARCHAR(64) NOT NULL,
  target_type ENUM('crew', 'user') NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  details VARCHAR(500) NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  INDEX idx_reports_target (target_type, target_id),
  INDEX idx_reports_reporter (reporter_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS status ENUM('open', 'resolved') NOT NULL DEFAULT 'open' AFTER details;

-- In-app bug report / feedback messages — see routes/support.php. Reviewed from the admin panel
-- (see routes/admin.php) — `status` tracks whether that's happened yet.
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  contact_email VARCHAR(255) NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  INDEX idx_support_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS status ENUM('open', 'resolved') NOT NULL DEFAULT 'open' AFTER contact_email;

-- Admin-panel accounts (see routes/admin.php, admin-auth.php) — entirely separate from the app's
-- own Clerk-authenticated `users`. Seeded once via scripts/seed-admin.php (see that file's doc
-- comment), then manageable from the panel itself (Admin Management page).
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uniq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A single active app-wide announcement banner, shown on the app's Home tab (see
-- components/AnnouncementBanner.tsx) — the admin panel's "Page Management" (see routes/admin.php).
-- Only ever one row is `active`; setting a new one active clears the previous automatically.
CREATE TABLE IF NOT EXISTS app_announcements (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(500) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_announcements_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Two-way support conversation — a support_messages row is the ticket/thread; each back-and-forth
-- message (from the user, via the app, or an admin, via the panel) is a row here. See
-- routes/support.php (app side, POST reply) and routes/admin.php (panel side, POST reply).
CREATE TABLE IF NOT EXISTS support_replies (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  support_message_id BIGINT NOT NULL,
  sender_type ENUM('admin', 'user') NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_supportreplies_message FOREIGN KEY (support_message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
  INDEX idx_supportreplies_message (support_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Internal admin-only notes — never shown to the end user, regardless of target_type. Shown on a
-- user's/crew's admin-panel detail page, or alongside a support ticket. See routes/admin.php.
CREATE TABLE IF NOT EXISTS admin_notes (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('user', 'crew', 'support') NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  note VARCHAR(2000) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_adminnotes_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Internal admin task board (Kanban + calendar, see admin/src/pages/Tasks.tsx) — team project
-- planning, not app data. `assigned_admin_id`/`created_by` are admin_users.id but deliberately
-- have no FK there: removing an admin later should never cascade-delete or orphan-break a task.
CREATE TABLE IF NOT EXISTS admin_tasks (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000) NULL,
  status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  due_date DATE NULL,
  assigned_admin_id VARCHAR(64) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_admintasks_status (status),
  INDEX idx_admintasks_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Public-ish roadmap (planned / in progress / shipped) — managed from the admin panel's Roadmap
-- page, read by both the admin panel and the app itself (see routes/roadmap.php's GET, behind the
-- normal Clerk auth gate — any signed-in user can see it, same visibility as everything else
-- app-side; not exposed to the fully public marketing-site paths).
CREATE TABLE IF NOT EXISTS roadmap_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  status ENUM('planned', 'in_progress', 'shipped') NOT NULL DEFAULT 'planned',
  display_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_roadmap_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional TOTP 2FA secret for an admin account (see routes/admin.php's adminLogin + admin-auth.php).
-- NULL means 2FA is off for that admin. Set once via the Admin Management page's "Enable 2FA" flow.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) NULL;

-- Every consequential admin action — who did what, to what, when. Shown on the Audit Log page.
-- Also doubles as the admin login history (action = 'login'), so a separate sessions table isn't
-- needed. Append-only, never edited or deleted by the app itself.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NULL,
  target_id VARCHAR(64) NULL,
  details VARCHAR(500) NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_auditlog_created (created_at),
  INDEX idx_auditlog_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Generic key/value settings the admin panel can edit without a redeploy (see routes/admin.php's
-- settings endpoints) — a small, deliberately unstructured escape hatch, same shape as
-- backend/routes/state.php's user_state table but for app-wide config instead of per-user data.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(64) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- "What's New" entries — admin-managed, shown in the app (Profile -> What's New), same
-- admin-CRUD-plus-app-facing-GET shape as roadmap_items/app_announcements.
CREATE TABLE IF NOT EXISTS changelog_entries (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin-managed FAQ / knowledge base, shown in the app under Support.
CREATE TABLE IF NOT EXISTS faq_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer VARCHAR(2000) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User-submitted feature requests users can upvote (loosely inspired by tools like Fider — built
-- fresh here rather than reusing Fider's own code, which is AGPL-licensed and a whole separate Go
-- app, not something embeddable into this panel). Admins triage `status` and, once accepted, add a
-- matching entry to roadmap_items by hand — the two are related but deliberately not the same
-- table, since not every raw suggestion belongs on the public roadmap.
CREATE TABLE IF NOT EXISTS feedback_items (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(1000) NULL,
  status ENUM('open', 'planned', 'declined', 'shipped') NOT NULL DEFAULT 'open',
  votes_count INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feedback_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per (feedback item, voter) — the join table that makes voting idempotent (a user can't
-- double-vote) and reversible (un-voting is just deleting their row). `feedback_items.votes_count`
-- is a denormalized counter kept in sync by routes/feedback.php, so listing/sorting by vote count
-- never needs a COUNT(*) join.
CREATE TABLE IF NOT EXISTS feedback_votes (
  feedback_id BIGINT NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (feedback_id, user_id),
  CONSTRAINT fk_feedbackvotes_item FOREIGN KEY (feedback_id) REFERENCES feedback_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedbackvotes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only system-status history — the latest row (by created_at) is the current status, same
-- "latest row wins" convention as app_announcements. Shown in the app as a small status indicator.
CREATE TABLE IF NOT EXISTS status_updates (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  status ENUM('operational', 'degraded', 'down') NOT NULL DEFAULT 'operational',
  message VARCHAR(500) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- First-party product-analytics telemetry (see routes/track.php) — the admin panel's own Analytics
-- page and User Detail "Behavior" tab read straight from this table (routes/analytics-events.php)
-- instead of a third-party analytics API. One row per screen view or named in-app action (the same
-- events the app already fires — see src/lib/analytics.ts). No FK on user_id on purpose: this is
-- high-volume telemetry, not core relational data, so a deleted user's historical event rows are
-- left as harmless orphans instead of cascading a bulk delete through possibly millions of rows.
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,     -- 'screen_view', or a named action like 'workout_started'
  screen_name VARCHAR(255) NULL,       -- set on 'screen_view' events
  properties_json JSON NULL,
  created_at BIGINT NOT NULL,          -- epoch milliseconds
  INDEX idx_analytics_events_type_date (event_type, created_at),
  INDEX idx_analytics_events_screen_date (screen_name, created_at),
  INDEX idx_analytics_events_session (session_id),
  INDEX idx_analytics_events_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per user's submitted Instagram/TikTok handles (see routes/user-socials.php) — collected
-- via an in-app prompt so the admin panel's Social Verification page can check whether people are
-- actually posting about GymCrew. `is_promoting` is an admin's manual verdict after eyeballing the
-- linked profiles (NULL = not reviewed yet), not something computed automatically.
CREATE TABLE IF NOT EXISTS user_socials (
  user_id VARCHAR(64) NOT NULL PRIMARY KEY,
  instagram_handle VARCHAR(64) NOT NULL,
  tiktok_handle VARCHAR(64) NOT NULL,
  submitted_at BIGINT NOT NULL,
  reviewed_at BIGINT NULL,
  reviewed_by VARCHAR(255) NULL,
  is_promoting BOOLEAN NULL,
  admin_notes VARCHAR(500) NOT NULL DEFAULT '',
  CONSTRAINT fk_usersocials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per admin-composed message sent to one recipient (see routes/admin-messages.php) — shown
-- in the app as a blocking-until-dismissed overlay (unlike a push notification, which can be missed
-- or ignored outside the app). Used from the admin panel's User Management "Send Message" bulk
-- action, e.g. to warn specific unverified accounts before they lose access.
CREATE TABLE IF NOT EXISTS admin_messages (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  sent_by VARCHAR(255) NOT NULL,
  sent_at BIGINT NOT NULL,
  dismissed_at BIGINT NULL,
  CONSTRAINT fk_adminmessages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_adminmessages_user_pending (user_id, dismissed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
