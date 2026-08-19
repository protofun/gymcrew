import type { MuscleGroup } from "@/data/workout-log";
import { toMuscleGroup } from "@/lib/muscle-groups";
import type { LoggedExercise } from "@/store/active-workout-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";

export type WorkoutPr = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousBestKg: number | null;
  previousAchievedAt: number | null;
};

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

/**
 * Checks each exercise's heaviest completed set against its stored personal record, updating the
 * record store for anything that's a new best. Returns the PRs hit this session, heaviest jump first.
 */
export function checkPersonalRecords(exercises: LoggedExercise[]): WorkoutPr[] {
  const { checkAndRecord } = usePersonalRecordsStore.getState();
  const prs: WorkoutPr[] = [];

  for (const exercise of exercises) {
    const heaviestCompleted = exercise.sets
      .filter((set) => set.completed && !set.isWarmup && set.weightKg !== null)
      .reduce<{ weightKg: number; reps: number } | null>((best, set) => {
        const weightKg = set.weightKg as number;
        return !best || weightKg > best.weightKg ? { weightKg, reps: set.reps ?? 0 } : best;
      }, null);

    if (!heaviestCompleted) continue;

    const { isNewRecord, previousBestKg, previousAchievedAt } = checkAndRecord(
      exercise.exerciseId,
      exercise.name,
      heaviestCompleted.weightKg,
      heaviestCompleted.reps,
    );

    if (isNewRecord) {
      prs.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.name,
        weightKg: heaviestCompleted.weightKg,
        reps: heaviestCompleted.reps,
        previousBestKg,
        previousAchievedAt,
      });
    }
  }

  return prs.sort((a, b) => b.weightKg - (b.previousBestKg ?? 0) - (a.weightKg - (a.previousBestKg ?? 0)));
}
