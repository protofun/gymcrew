import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS } from "@/data/rank-lifts";
import type { LoggedExercise } from "@/store/active-workout-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";

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
 * A PR is a real rank/medal moment — see workout/pr-celebration.tsx and ranks/whats-my-rank.tsx's
 * "Log as PR", which both show a tier badge for *any* exercise via the generic muscle-group-proxy
 * engine, not just the Ranks tab's own tracked board. Without calling this alongside recording a
 * PR, a PR on an exercise that isn't already tracked gets celebrated once and then genuinely
 * vanishes — the Ranks tab has no tile to show it on at all. Ensures it's tracked: restores it if
 * it's one of the defaults the user had hidden, otherwise adds it as a custom tile — same logic
 * ranks.tsx's own "+ Add" flow uses when picking an exercise that happens to match a default.
 */
export function ensureExerciseTrackedOnRanksBoard(exerciseId: string): void {
  const matchingDefault = [...MAJOR_LIFT_CARDS, ...SEEDED_LIFT_CARDS].find((lift) => lift.exerciseId === exerciseId);
  const trackedLifts = useTrackedLiftsStore.getState();
  if (matchingDefault) trackedLifts.restoreDefaultLift(matchingDefault.id);
  else trackedLifts.addCustomLift(exerciseId);
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
      ensureExerciseTrackedOnRanksBoard(exercise.exerciseId);

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
