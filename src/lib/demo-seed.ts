import { EXERCISE_BY_ID } from "@/data/exercises";
import { advanceDivision, type Division } from "@/lib/division";
import { computeCompletedSets, computeMuscleIntensity, computeVolumeKg } from "@/lib/workout-metrics";
import type { WorkoutPr } from "@/lib/workout-finish";
import type { LoggedExercise, LoggedSet } from "@/store/active-workout-store";
import type { BodyLogEntry } from "@/store/body-log-store";
import type { DivisionHistoryEntry } from "@/store/crew-store";
import type { PersonalRecord } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * A full year of realistic, ever-improving Push/Pull/Legs training history, run 6 days a week (the
 * PPL split twice through, Sunday off) — the demo dataset behind a fresh "me" account, so a brand
 * new install already looks like a year of real, dedicated, consistent progress instead of an empty
 * app. Every derived store (workout history, personal records, body log, division/XP) is generated
 * from this SAME timeline, so the numbers agree with each other everywhere they're shown (a PR badge
 * in history matches the record on the Ranks tab, which matches the XP that got spent to reach the
 * current division, etc).
 *
 * Each store only backfills this when its OWN persisted state is genuinely empty (see the `merge`
 * function on each store) — a real logged workout, weight entry, or earned XP always wins. To force
 * this onto an account that already has other data, see the "Load a Year of Training Data" action in
 * profile/account.tsx.
 */
const DAY_MS = 86400000;
const TRAINING_DAYS = 365;

type ExercisePlan = {
  exerciseId: string;
  startWeightKg: number;
  endWeightKg: number;
  startReps: number;
  endReps: number;
  sets: number;
};

// Bodyweight-only lift (Pullups) starts at 0 added weight; Crunches is reps-only (no load at all).
const PUSH_PLAN: ExercisePlan[] = [
  { exerciseId: "Barbell_Bench_Press_-_Medium_Grip", startWeightKg: 145, endWeightKg: 195, startReps: 5, endReps: 5, sets: 4 },
  { exerciseId: "Barbell_Shoulder_Press", startWeightKg: 82, endWeightKg: 120, startReps: 5, endReps: 5, sets: 3 },
  { exerciseId: "Barbell_Incline_Bench_Press_-_Medium_Grip", startWeightKg: 62, endWeightKg: 92, startReps: 8, endReps: 8, sets: 3 },
  { exerciseId: "Triceps_Pushdown", startWeightKg: 38, endWeightKg: 58, startReps: 10, endReps: 10, sets: 3 },
];
const PULL_PLAN: ExercisePlan[] = [
  { exerciseId: "Barbell_Deadlift", startWeightKg: 220, endWeightKg: 300, startReps: 3, endReps: 3, sets: 4 },
  { exerciseId: "Pullups", startWeightKg: 0, endWeightKg: 25, startReps: 6, endReps: 8, sets: 4 },
  { exerciseId: "Bent_Over_Barbell_Row", startWeightKg: 75, endWeightKg: 110, startReps: 8, endReps: 8, sets: 3 },
  { exerciseId: "Seated_Cable_Rows", startWeightKg: 60, endWeightKg: 95, startReps: 10, endReps: 10, sets: 3 },
  { exerciseId: "Barbell_Curl", startWeightKg: 35, endWeightKg: 57.5, startReps: 8, endReps: 8, sets: 3 },
];
const LEG_PLAN: ExercisePlan[] = [
  { exerciseId: "Barbell_Squat", startWeightKg: 140, endWeightKg: 200, startReps: 5, endReps: 5, sets: 4 },
  { exerciseId: "Leg_Press", startWeightKg: 180, endWeightKg: 280, startReps: 8, endReps: 8, sets: 3 },
  { exerciseId: "Barbell_Lunge", startWeightKg: 40, endWeightKg: 70, startReps: 8, endReps: 8, sets: 3 },
  { exerciseId: "Romanian_Deadlift", startWeightKg: 95, endWeightKg: 140, startReps: 8, endReps: 8, sets: 3 },
  { exerciseId: "Standing_Calf_Raises", startWeightKg: 60, endWeightKg: 95, startReps: 12, endReps: 12, sets: 3 },
  { exerciseId: "Cable_Crunch", startWeightKg: 20, endWeightKg: 45, startReps: 12, endReps: 12, sets: 3 },
  { exerciseId: "Crunches", startWeightKg: 0, endWeightKg: 0, startReps: 15, endReps: 30, sets: 3 },
];

const SPLIT: { name: string; plan: ExercisePlan[] }[] = [
  { name: "Push Day", plan: PUSH_PLAN },
  { name: "Pull Day", plan: PULL_PLAN },
  { name: "Leg Day", plan: LEG_PLAN },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function buildExercise(plan: ExercisePlan, progress: number, seed: string): LoggedExercise {
  const exercise = EXERCISE_BY_ID[plan.exerciseId];
  const isReallyBodyweight = plan.endWeightKg === 0;
  const jitter = ((hashString(seed) % 7) - 3) / 100; // ±3%, session-to-session variation
  const targetWeight = plan.startWeightKg + (plan.endWeightKg - plan.startWeightKg) * progress;
  const weightKg = isReallyBodyweight ? 0 : Math.max(0, roundToHalf(targetWeight * (1 + jitter)));
  const targetReps = Math.round(plan.startReps + (plan.endReps - plan.startReps) * progress);

  const sets: LoggedSet[] = Array.from({ length: plan.sets }, (_, index) => ({
    id: `demo-set-${seed}-${index}`,
    // Bodyweight-only lifts (bar hangs, crunches) log as `null` weight, same as a real logged set.
    weightKg: plan.startWeightKg === 0 && plan.endWeightKg === 0 ? null : weightKg,
    reps: Math.max(1, targetReps - (index === plan.sets - 1 ? 1 : 0)), // last set: fatigue drops a rep
    completed: true,
    isWarmup: false,
  }));

  return {
    exerciseId: plan.exerciseId,
    name: exercise.name,
    imageUrl: exercise.imageUrl,
    primaryMuscle: exercise.primaryMuscles[0] ?? "",
    note: "",
    sets,
  };
}

function heaviestSet(exercise: LoggedExercise): { weightKg: number; reps: number } | null {
  return exercise.sets.reduce<{ weightKg: number; reps: number } | null>((best, set) => {
    if (set.weightKg === null) return best;
    return !best || set.weightKg > best.weightKg ? { weightKg: set.weightKg, reps: set.reps ?? 0 } : best;
  }, null);
}

function generateYearOfTraining(referenceNow: number): CompletedWorkout[] {
  const workouts: CompletedWorkout[] = [];
  const bestByExercise = new Map<string, { weightKg: number; reps: number }>();
  let splitIndex = 0;

  // Oldest to newest, so `progress` (and therefore every lift's weight) only ever climbs.
  for (let daysAgo = TRAINING_DAYS; daysAgo >= 1; daysAgo--) {
    const date = new Date(referenceNow - daysAgo * DAY_MS);
    const weekday = date.getDay(); // 0 Sun .. 6 Sat
    if (weekday === 0) continue; // Sunday always off — 6 days/week, a PPL split run twice through the week
    if (hashString(`skip-${daysAgo}`) % 30 === 0) continue; // ~3% of training days missed — consistent, not robotic

    const progress = (TRAINING_DAYS - daysAgo) / TRAINING_DAYS;
    const day = SPLIT[splitIndex % SPLIT.length];
    splitIndex++;

    const exercises = day.plan.map((plan) => buildExercise(plan, progress, `${plan.exerciseId}-${daysAgo}`));

    const prs: WorkoutPr[] = [];
    for (const exercise of exercises) {
      const heaviest = heaviestSet(exercise);
      if (!heaviest) continue;
      const previous = bestByExercise.get(exercise.exerciseId);
      if (!previous || heaviest.weightKg > previous.weightKg) {
        prs.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          weightKg: heaviest.weightKg,
          reps: heaviest.reps,
          previousBestKg: previous?.weightKg ?? null,
          previousAchievedAt: null,
        });
        bestByExercise.set(exercise.exerciseId, heaviest);
      }
    }

    const eveningOffsetMinutes = hashString(`time-${daysAgo}`) % 120; // trains sometime 5:00-7:00pm
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const completedAt = dayStart + 17 * 3600000 + eveningOffsetMinutes * 60000;
    const durationSeconds = 2700 + (hashString(`dur-${daysAgo}`) % 1500); // 45-70 min

    workouts.push({
      id: `demo-${daysAgo}`,
      name: day.name,
      completedAt,
      durationSeconds,
      unit: "kg",
      notes: "",
      exercises,
      muscleIntensity: computeMuscleIntensity(exercises),
      volumeKg: Math.round(computeVolumeKg(exercises)),
      completedSets: computeCompletedSets(exercises),
      prs,
    });
  }

  return workouts.reverse(); // store convention: newest first
}

function generateRecords(workouts: CompletedWorkout[]): Record<string, PersonalRecord> {
  const records: Record<string, PersonalRecord> = {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const heaviest = heaviestSet(exercise);
      if (!heaviest) continue;
      const existing = records[exercise.exerciseId];
      if (!existing || heaviest.weightKg > existing.bestWeightKg) {
        records[exercise.exerciseId] = {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          bestWeightKg: heaviest.weightKg,
          bestReps: heaviest.reps,
          achievedAt: workout.completedAt,
        };
      }
    }
  }
  return records;
}

function generateBodyLog(referenceNow: number): BodyLogEntry[] {
  const totalWeeks = 52;
  const startWeightKg = 78;
  const endWeightKg = 86;
  const startBodyFat = 19;
  const endBodyFat = 13;
  const entries: BodyLogEntry[] = [];

  for (let weeksAgo = totalWeeks; weeksAgo >= 0; weeksAgo--) {
    const progress = (totalWeeks - weeksAgo) / totalWeeks;
    const weightJitter = ((hashString(`bw-${weeksAgo}`) % 9) - 4) / 10; // ±0.4kg
    const weightKg = Math.round((startWeightKg + (endWeightKg - startWeightKg) * progress + weightJitter) * 10) / 10;
    const bodyFatPercent = Math.round((startBodyFat + (endBodyFat - startBodyFat) * progress) * 10) / 10;
    entries.push({ id: `demo-body-${weeksAgo}`, loggedAt: referenceNow - weeksAgo * 7 * DAY_MS, weightKg, bodyFatPercent });
  }

  return entries.reverse(); // store convention: newest first
}

function generateProfileLevel(workouts: CompletedWorkout[]): { xp: number; division: Division; divisionHistory: DivisionHistoryEntry[] } {
  const WORKOUT_XP = 40;
  const PR_XP_BONUS = 20;
  const chronological = [...workouts].reverse(); // oldest first
  let xp = 0;
  let division: Division = "Rookie";
  const divisionHistory: DivisionHistoryEntry[] = [{ division: "Rookie", reachedAt: chronological[0]?.completedAt ?? Date.now() }];

  for (const workout of chronological) {
    const result = advanceDivision(xp, division, WORKOUT_XP + workout.prs.length * PR_XP_BONUS);
    xp = result.xp;
    if (result.leveledUp) {
      division = result.division;
      divisionHistory.push({ division, reachedAt: workout.completedAt });
    }
  }

  return { xp, division, divisionHistory };
}

const now = Date.now();
export const DEMO_WORKOUTS = generateYearOfTraining(now);
export const DEMO_RECORDS = generateRecords(DEMO_WORKOUTS);
export const DEMO_BODY_LOG = generateBodyLog(now);
export const DEMO_PROFILE_LEVEL = generateProfileLevel(DEMO_WORKOUTS);
