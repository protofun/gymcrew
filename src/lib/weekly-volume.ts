import type { TrendPoint } from "@/components/TrendChart";
import { currentWeekKey } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type WeeklyMetric = "volume" | "sets" | "workouts" | "duration";

/** One shared grouping pass — every weekly metric is "sum something per week", only what's summed
 * changes. Only real (non-backfilled) workouts count, and weeks with nothing logged are left out
 * rather than shown as a flat zero, so early history doesn't read as a chart that's broken. */
function weeklyTrend(workouts: CompletedWorkout[], weeks: number, valueOf: (workout: CompletedWorkout) => number): TrendPoint[] {
  const totals = new Map<string, number>();
  for (const workout of workouts) {
    if (workout.isBackfilled) continue;
    const key = currentWeekKey(new Date(workout.completedAt));
    totals.set(key, (totals.get(key) ?? 0) + valueOf(workout));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-weeks)
    .map(([date, value]) => ({ date, value: Math.round(value) }));
}

/** Total training volume per week, most recent last — the closest thing Home has to the app's own
 * "strength over time" promise (see AGENTS.md's "objective proof of progress"). */
export function computeWeeklyVolumeTrend(workouts: CompletedWorkout[], weeks = 8): TrendPoint[] {
  return weeklyTrend(workouts, weeks, (workout) => workout.volumeKg);
}

/** Total completed sets per week — a simpler read on "how much did I do" than volume, which weight
 * and rep choices both move. */
export function computeWeeklySetsTrend(workouts: CompletedWorkout[], weeks = 8): TrendPoint[] {
  return weeklyTrend(workouts, weeks, (workout) => workout.completedSets);
}

/** Workouts logged per week — consistency, not intensity. */
export function computeWeeklyWorkoutsTrend(workouts: CompletedWorkout[], weeks = 8): TrendPoint[] {
  return weeklyTrend(workouts, weeks, () => 1);
}

/** Total time spent training per week, in minutes. */
export function computeWeeklyDurationTrend(workouts: CompletedWorkout[], weeks = 8): TrendPoint[] {
  return weeklyTrend(workouts, weeks, (workout) => workout.durationSeconds / 60);
}
