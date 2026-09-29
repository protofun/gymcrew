import type { LoggedSet } from "@/store/active-workout-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** The sets logged for this exercise in the most recent past workout that included it, if any. */
export function getLastPerformance(workouts: CompletedWorkout[], exerciseId: string): LoggedSet[] | null {
  for (const workout of workouts) {
    const match = workout.exercises.find((exercise) => exercise.exerciseId === exerciseId);
    if (match) return match.sets;
  }
  return null;
}

export type ExerciseHistoryEntry = { completedAt: number; topSet: LoggedSet };

/** The last few times this exercise was logged, most recent first — each entry's own heaviest
 * completed, non-warmup set (the one number worth glancing at, not the whole session's sets) plus
 * when that session happened. Feeds `WorkoutLogger`'s history picker ("welke cijfers je in het
 * verleden hebt behaald"), so tapping through past numbers while actively logging a set doesn't need
 * to leave this screen. */
export function getExerciseHistory(workouts: CompletedWorkout[], exerciseId: string, limit = 4): ExerciseHistoryEntry[] {
  const entries: ExerciseHistoryEntry[] = [];
  for (const workout of workouts) {
    const match = workout.exercises.find((exercise) => exercise.exerciseId === exerciseId);
    const candidates = match?.sets.filter((set) => set.completed && !set.isWarmup && set.weightKg !== null) ?? [];
    if (candidates.length === 0) continue;
    const topSet = candidates.reduce((best, set) => ((set.weightKg ?? 0) > (best.weightKg ?? 0) ? set : best));
    entries.push({ completedAt: workout.completedAt, topSet });
    if (entries.length >= limit) break;
  }
  return entries;
}
