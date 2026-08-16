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

export type WorkoutSession = {
  name: string;
  exercises: number;
  durationMin: number;
  volumeKg: number;
  calories: number;
  muscleIntensity: MuscleIntensity;
};

/**
 * Mock workout history until the real workout log store exists.
 * Simulates a Push/Pull/Legs/Upper split on Mon/Tue/Thu/Fri over the past 3 months.
 */
const SPLIT_BY_WEEKDAY: Partial<Record<number, { name: string; muscleIntensity: MuscleIntensity }>> = {
  1: { name: "Push Day", muscleIntensity: { chest: 9, shoulders: 6, triceps: 5 } },
  2: { name: "Pull Day", muscleIntensity: { back: 9, biceps: 7 } },
  4: { name: "Leg Day", muscleIntensity: { quads: 9, hamstrings: 6, calves: 5, glutes: 6 } },
  5: { name: "Upper Body", muscleIntensity: { chest: 7, back: 7, shoulders: 8 } },
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

function generateMockSessions(monthsBack: number): Record<string, WorkoutSession> {
  const sessions: Record<string, WorkoutSession> = {};
  const end = new Date();
  const cursor = new Date();
  cursor.setMonth(cursor.getMonth() - monthsBack);
  cursor.setDate(1);

  while (cursor <= end) {
    const split = SPLIT_BY_WEEKDAY[cursor.getDay()];
    if (split) {
      const dateKey = toDateKey(cursor);
      const hash = hashString(dateKey);
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
      };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

export const MOCK_WORKOUT_SESSIONS = generateMockSessions(3);
