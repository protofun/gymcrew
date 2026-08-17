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
