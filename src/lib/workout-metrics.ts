import type { MuscleGroup } from "@/data/workout-log";
import { toMuscleGroup } from "@/lib/muscle-groups";
import type { LoggedExercise } from "@/store/active-workout-store";

/**
 * Pure derived-stat calculations for a set of logged exercises — split out from workout-finish.ts
 * (which also touches the personal-records store) so anything that only needs these numbers, like
 * lib/demo-seed.ts, doesn't pull in that store and risk a circular import.
 */

/** Per-muscle-group set counts for the session, capped at 10 to match the heatmap's 1-10 scale. */
export function computeMuscleIntensity(exercises: LoggedExercise[]): Partial<Record<MuscleGroup, number>> {
  const setsByGroup: Partial<Record<MuscleGroup, number>> = {};

  for (const exercise of exercises) {
    const group = toMuscleGroup(exercise.primaryMuscle);
    if (!group) continue;
    const completedSets = exercise.sets.filter((set) => set.completed && !set.isWarmup).length;
    if (completedSets === 0) continue;
    setsByGroup[group] = (setsByGroup[group] ?? 0) + completedSets;
  }

  const intensity: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, sets] of Object.entries(setsByGroup) as [MuscleGroup, number][]) {
    intensity[group] = Math.min(10, sets);
  }
  return intensity;
}

export function computeVolumeKg(exercises: LoggedExercise[]): number {
  return exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets
        .filter((set) => set.completed && !set.isWarmup)
        .reduce((setSum, set) => setSum + (set.weightKg ?? 0) * (set.reps ?? 0), 0),
    0,
  );
}

export function computeCompletedSets(exercises: LoggedExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed && !set.isWarmup).length, 0);
}

/** Epley-formula 1RM estimate from a single logged set. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : Math.round(weightKg * (1 + reps / 30));
}
