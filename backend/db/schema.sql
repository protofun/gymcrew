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

CREATE TABLE IF NOT EXISTS body_log_entries (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  logged_at BIGINT NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  body_fat_percent DECIMAL(4,2) NULL,
  CONSTRAINT fk_bodylog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_bodylog_user_date (user_id, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
