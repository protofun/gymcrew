import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { currentWeekKey } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type ChartMetric = "volume" | "reps" | "duration" | "sets";

export const CHART_METRICS: { key: ChartMetric; label: string; unit: string }[] = [
  { key: "volume", label: "Volume", unit: "kg" },
  { key: "reps", label: "Reps", unit: "" },
  { key: "duration", label: "Duration", unit: "min" },
  { key: "sets", label: "Sets", unit: "" },
];

export function totalReps(workout: CompletedWorkout): number {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.completed).reduce((setSum, set) => setSum + (set.reps ?? 0), 0),
    0,
  );
}

const METRIC_VALUE: Record<ChartMetric, (workout: CompletedWorkout) => number> = {
  volume: (workout) => workout.volumeKg,
  reps: totalReps,
  duration: (workout) => Math.round(workout.durationSeconds / 60),
  sets: (workout) => workout.completedSets,
};

export type WorkoutTotals = {
  workouts: number;
  volumeKg: number;
  sets: number;
  reps: number;
  durationSeconds: number;
  avgDurationSeconds: number;
};

/** All-time (or whatever slice of `workouts` is passed in) sums — the building blocks for every
 * "totals" stat shown across Training History, Rank Over Time, and the All Stats page. */
export function workoutTotals(workouts: CompletedWorkout[]): WorkoutTotals {
  const totals = workouts.reduce(
    (acc, workout) => ({
      volumeKg: acc.volumeKg + workout.volumeKg,
      sets: acc.sets + workout.completedSets,
      reps: acc.reps + totalReps(workout),
      durationSeconds: acc.durationSeconds + workout.durationSeconds,
    }),
    { volumeKg: 0, sets: 0, reps: 0, durationSeconds: 0 },
  );
  return { workouts: workouts.length, ...totals, avgDurationSeconds: workouts.length > 0 ? Math.round(totals.durationSeconds / workouts.length) : 0 };
}

/** Which muscle group got the most (and least) combined training intensity across `workouts` — the
 * least-trained group is always reported, even at 0, so a "you're neglecting X" callout is possible. */
export function muscleTrainingBreakdown(workouts: CompletedWorkout[]): { most: MuscleGroup | null; least: MuscleGroup | null } {
  const totals: Record<MuscleGroup, number> = Object.fromEntries(ALL_MUSCLE_GROUPS.map((group) => [group, 0])) as Record<MuscleGroup, number>;
  for (const workout of workouts) {
    for (const [group, value] of Object.entries(workout.muscleIntensity) as [MuscleGroup, number][]) {
      totals[group] += value;
    }
  }
  const entries = ALL_MUSCLE_GROUPS.map((group) => [group, totals[group]] as const);
  if (entries.every(([, value]) => value === 0)) return { most: null, least: null };
  const most = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  const least = entries.reduce((worst, entry) => (entry[1] < worst[1] ? entry : worst))[0];
  return { most, least };
}

/** The single highest-volume week on record — a nice "personal best week" callout. */
export function bestWeek(workouts: CompletedWorkout[]): { weekKey: string; volumeKg: number } | null {
  const byWeek = new Map<string, number>();
  for (const workout of workouts) {
    const key = currentWeekKey(new Date(workout.completedAt));
    byWeek.set(key, (byWeek.get(key) ?? 0) + workout.volumeKg);
  }
  let best: { weekKey: string; volumeKg: number } | null = null;
  for (const [weekKey, volumeKg] of byWeek) {
    if (!best || volumeKg > best.volumeKg) best = { weekKey, volumeKg };
  }
  return best;
}

/**
 * Sums a metric per week for the last `weeks` weeks (oldest first), ending with the current week —
 * weekly rather than daily because a per-day series is mostly zeros (rest days) and reads as noise
 * rather than a trend; summing by week smooths that out.
 */
export function weeklyMetricSeries(workouts: CompletedWorkout[], metric: ChartMetric, weeks: number): { date: string; value: number }[] {
  const byWeek = new Map<string, number>();
  for (const workout of workouts) {
    const key = currentWeekKey(new Date(workout.completedAt));
    byWeek.set(key, (byWeek.get(key) ?? 0) + METRIC_VALUE[metric](workout));
  }

  const today = new Date();
  const points: { date: string; value: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const reference = new Date(today);
    reference.setDate(reference.getDate() - i * 7);
    const key = currentWeekKey(reference);
    points.push({ date: key, value: Math.round((byWeek.get(key) ?? 0) * 10) / 10 });
  }
  return points;
}
