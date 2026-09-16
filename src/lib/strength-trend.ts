import { EXERCISE_BY_ID } from "@/data/exercises";
import { addDays } from "@/lib/date";
import { MAJOR_LIFT_EXERCISE_IDS, type MajorLift } from "@/lib/rank";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type StrengthDelta = {
  majorLift: MajorLift;
  exerciseName: string;
  previousBestKg: number;
  currentBestKg: number;
  percentChange: number;
};

/** Below this, a heavier set reads as noise (better warm-up, different bar) rather than a real gain
 * worth pushing a notification about. */
const MIN_PERCENT_IMPROVEMENT = 5;

function heaviestSetInWindow(workouts: CompletedWorkout[], exerciseId: string, from: Date, to: Date): number | null {
  let best: number | null = null;
  for (const workout of workouts) {
    if (workout.isBackfilled) continue;
    const completedAt = new Date(workout.completedAt);
    if (completedAt < from || completedAt >= to) continue;

    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (!set.completed || set.isWarmup || set.weightKg === null) continue;
        if (best === null || set.weightKg > best) best = set.weightKg;
      }
    }
  }
  return best;
}

/**
 * The single major lift with the biggest month-over-month strength gain, if any clears
 * `MIN_PERCENT_IMPROVEMENT` — powers the "you're X% stronger" notification (see
 * push-notifications.ts's "stronger-progress" reminder kind). A lift only qualifies with real,
 * same-day-logged sets in both the trailing 30 days and the 30 days before that, so a single
 * session with nothing to compare against never produces a false "improvement".
 */
export function computeStrongestMonthlyGain(workouts: CompletedWorkout[], now: Date = new Date()): StrengthDelta | null {
  const windowStart = addDays(now, -30);
  const priorWindowStart = addDays(now, -60);

  let best: StrengthDelta | null = null;
  for (const [majorLift, exerciseId] of Object.entries(MAJOR_LIFT_EXERCISE_IDS) as [MajorLift, string][]) {
    const currentBestKg = heaviestSetInWindow(workouts, exerciseId, windowStart, now);
    const previousBestKg = heaviestSetInWindow(workouts, exerciseId, priorWindowStart, windowStart);
    if (currentBestKg === null || previousBestKg === null || previousBestKg === 0) continue;

    const percentChange = ((currentBestKg - previousBestKg) / previousBestKg) * 100;
    if (percentChange < MIN_PERCENT_IMPROVEMENT) continue;
    if (best && percentChange <= best.percentChange) continue;

    best = {
      majorLift,
      exerciseName: EXERCISE_BY_ID[exerciseId]?.name ?? majorLift,
      previousBestKg,
      currentBestKg,
      percentChange,
    };
  }
  return best;
}
