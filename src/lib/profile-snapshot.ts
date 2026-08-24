import type { Division } from "@/lib/division";
import { computeCurrentStreak } from "@/lib/streak";
import type { PersonalRecord } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type ProfileSnapshot = {
  division: Division;
  workoutsCount: number;
  volumeKg: number;
  prCount: number;
  streak: number;
  records: Record<string, PersonalRecord>;
  workoutsUpToDate: CompletedWorkout[];
};

/**
 * Replays every workout's PRs in chronological order, keeping the heaviest set logged for each
 * exercise up to that point — the same "best-so-far" shape personal-records-store keeps live, just
 * frozen at an arbitrary past moment instead of now. Exported on its own so screens that only need
 * the records map (Ranks, Achievements) don't have to pull in the rest of the snapshot.
 */
export function buildSnapshotRecords(workoutsUpToDate: CompletedWorkout[]): Record<string, PersonalRecord> {
  const records: Record<string, PersonalRecord> = {};
  for (const workout of [...workoutsUpToDate].sort((a, b) => a.completedAt - b.completedAt)) {
    for (const pr of workout.prs) {
      const previous = records[pr.exerciseId];
      if (!previous || pr.weightKg > previous.bestWeightKg) {
        records[pr.exerciseId] = {
          exerciseId: pr.exerciseId,
          exerciseName: pr.exerciseName,
          bestWeightKg: pr.weightKg,
          bestReps: pr.reps,
          achievedAt: workout.completedAt,
        };
      }
    }
  }
  return records;
}

/**
 * Reconstructs what the profile looked like as of a past date — used by the "viewing at X kg" mode
 * so the Profile, Ranks, Achievements, Training History, and All Stats screens all show what was
 * true back then, not today's numbers. Everything here is derived from genuinely timestamped
 * history (workouts, division-history), not guessed.
 */
export function computeProfileSnapshot(
  asOfMs: number,
  workouts: CompletedWorkout[],
  divisionHistory: { division: Division; reachedAt: number }[],
): ProfileSnapshot {
  const workoutsUpToDate = workouts.filter((workout) => workout.completedAt <= asOfMs);

  const division =
    [...divisionHistory]
      .filter((entry) => entry.reachedAt <= asOfMs)
      .sort((a, b) => b.reachedAt - a.reachedAt)[0]?.division ?? divisionHistory[0]?.division ?? "Rookie";

  const volumeKg = Math.round(workoutsUpToDate.reduce((sum, workout) => sum + workout.volumeKg, 0));
  const records = buildSnapshotRecords(workoutsUpToDate);

  return {
    division,
    workoutsCount: workoutsUpToDate.length,
    volumeKg,
    prCount: Object.keys(records).length,
    streak: computeCurrentStreak(workouts, new Date(asOfMs)),
    records,
    workoutsUpToDate,
  };
}
