import type { CompletedWorkout } from "@/store/workout-history-store";

/** The most recent OTHER workout (strictly before this one) that trained at least one of the
 * same exercises — "last time I did (some of) these exercises," for comparing progress against.
 * `workouts` is stored newest-first, so the first sufficiently-overlapping match found while
 * scanning forward is already the most recent one. */
export function findPreviousMatchingWorkout(workouts: CompletedWorkout[], current: CompletedWorkout): CompletedWorkout | null {
  const currentExerciseIds = new Set(current.exercises.map((exercise) => exercise.exerciseId));
  for (const candidate of workouts) {
    if (candidate.id === current.id || candidate.completedAt >= current.completedAt) continue;
    if (candidate.exercises.some((exercise) => currentExerciseIds.has(exercise.exerciseId))) return candidate;
  }
  return null;
}
