import { toDateKey } from "@/lib/date";

export type MuscleGroup =
  | "chest"
  | "shoulders"
  | "back"
  | "biceps"
  | "triceps"
  | "abs"
  | "quads"
  | "hamstrings"
  | "calves"
  | "glutes";

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "shoulders",
  "back",
  "biceps",
  "triceps",
  "abs",
  "quads",
  "hamstrings",
  "calves",
  "glutes",
];

/** Per-muscle-group training load for a session, on a 1-10 intensity scale. */
export type MuscleIntensity = Partial<Record<MuscleGroup, number>>;

export type PrimaryExercise = {
  name: string;
  reps: number;
  oneRepMaxKg: number;
};

export type WorkoutSession = {
  name: string;
  exercises: number;
  durationMin: number;
  volumeKg: number;
  calories: number;
  muscleIntensity: MuscleIntensity;
  primaryExercise: PrimaryExercise;
};

/**
 * Mock workout history until the real workout log store exists.
 * Simulates a Push/Pull/Legs/Upper split on Mon/Tue/Thu/Fri over the past 3 months.
 */
const SPLIT_BY_WEEKDAY: Partial<
  Record<
    number,
    {
      name: string;
      muscleIntensity: MuscleIntensity;
      primaryExercise: string;
      baseReps: number;
      baseOneRepMaxKg: number;
    }
  >
> = {
  1: {
    name: "Push Day",
    muscleIntensity: { chest: 9, shoulders: 6, triceps: 5 },
    primaryExercise: "Bench Press",
    baseReps: 40,
    baseOneRepMaxKg: 100,
  },
  2: {
    name: "Pull Day",
    muscleIntensity: { back: 9, biceps: 7 },
    primaryExercise: "Deadlift",
    baseReps: 24,
    baseOneRepMaxKg: 140,
  },
  4: {
    name: "Leg Day",
    muscleIntensity: { quads: 9, hamstrings: 6, calves: 5, glutes: 6 },
    primaryExercise: "Squat",
    baseReps: 30,
    baseOneRepMaxKg: 120,
  },
  5: {
    name: "Upper Body",
    muscleIntensity: { chest: 7, back: 7, shoulders: 8 },
    primaryExercise: "Overhead Press",
    baseReps: 36,
    baseOneRepMaxKg: 60,
  },
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function jitterIntensity(intensity: number, hash: number): number {
  const jitter = (hash % 3) - 1; // -1, 0, or 1
  return Math.max(1, Math.min(10, intensity + jitter));
}

/** `seed` lets callers generate a distinct-but-deterministic history per person (e.g. per crew member id). */
function generateMockSessions(monthsBack: number, seed = ""): Record<string, WorkoutSession> {
  const sessions: Record<string, WorkoutSession> = {};
  const end = new Date();
  const cursor = new Date();
  cursor.setMonth(cursor.getMonth() - monthsBack);
  cursor.setDate(1);

  while (cursor <= end) {
    const split = SPLIT_BY_WEEKDAY[cursor.getDay()];
    if (split) {
      const dateKey = toDateKey(cursor);
      const hash = hashString(seed + dateKey);
      const muscleIntensity: MuscleIntensity = {};
      for (const [group, intensity] of Object.entries(split.muscleIntensity) as [MuscleGroup, number][]) {
        muscleIntensity[group] = jitterIntensity(intensity, hash);
      }

      sessions[dateKey] = {
        name: split.name,
        exercises: 5 + (hash % 4),
        durationMin: 40 + (hash % 30),
        volumeKg: 8000 + (hash % 70) * 100,
        calories: 400 + (hash % 25) * 10,
        muscleIntensity,
        primaryExercise: {
          name: split.primaryExercise,
          reps: split.baseReps + (hash % 9) - 4,
          oneRepMaxKg: split.baseOneRepMaxKg + (hash % 11) - 5,
        },
      };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

export const MOCK_WORKOUT_SESSIONS = generateMockSessions(3);

/** A crew member's mock training history for their profile — same shape as MOCK_WORKOUT_SESSIONS, seeded per member so each looks distinct. */
export function generateMemberWorkoutSessions(memberId: string, monthsBack = 2): Record<string, WorkoutSession> {
  return generateMockSessions(monthsBack, memberId);
}
