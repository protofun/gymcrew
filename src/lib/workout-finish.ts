import type { LoggedExercise } from "@/store/active-workout-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";

export { computeCompletedSets, computeMuscleIntensity, computeVolumeKg } from "@/lib/workout-metrics";

export type WorkoutPr = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  previousBestKg: number | null;
  previousAchievedAt: number | null;
};

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
