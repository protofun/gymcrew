import type { MuscleGroup } from "@/data/workout-log";
import { computeMuscleSetCounts } from "@/lib/workout-metrics";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** Anything with a per-workout muscle breakdown — a real `CompletedWorkout` satisfies this
 * structurally, but so does a lighter adapter (e.g. a crew member's mock session data). */
export type IntensitySource = { muscleIntensity: Partial<Record<MuscleGroup, number>> };

/** Folds several workouts' muscle intensities into one 0-10 scale per group — shared by the
 * calendar (one day's workouts) and the weekly hero heatmap (a whole week's), so "how hard was
 * this trained" means the same thing everywhere it's shown. */
export function mergeMuscleIntensity(workouts: IntensitySource[]): Partial<Record<MuscleGroup, number>> {
  const merged: Partial<Record<MuscleGroup, number>> = {};
  for (const workout of workouts) {
    for (const [group, value] of Object.entries(workout.muscleIntensity) as [MuscleGroup, number][]) {
      merged[group] = Math.min(10, (merged[group] ?? 0) + value);
    }
  }
  return merged;
}

/** Real, uncapped completed-set totals per muscle group across several workouts — unlike
 * `mergeMuscleIntensity`, nothing here is clamped at 10, so a muscle group trained twice in one
 * week shows its real count instead of looking identical to a group trained exactly once. For a
 * genuine "how many sets did I actually do" comparison (e.g. `HomeMuscleBalance`'s bar chart), not
 * the heatmap's bounded color scale. */
export function sumMuscleSetCounts(workouts: CompletedWorkout[]): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};
  for (const workout of workouts) {
    for (const [group, count] of Object.entries(computeMuscleSetCounts(workout.exercises)) as [MuscleGroup, number][]) {
      totals[group] = (totals[group] ?? 0) + count;
    }
  }
  return totals;
}
