import { addDays } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";

export type WeeklyRecap = {
  workoutCount: number;
  prCount: number;
};

/** Rolling trailing-7-days summary (not calendar-week) for the Sunday-night "weekly recap"
 * notification (see push-notifications.ts's "weekly-recap" reminder kind) — counts only real,
 * same-day-logged workouts, matching every other reward-bearing stat in the app. */
export function computeWeeklyRecap(workouts: CompletedWorkout[], now: Date = new Date()): WeeklyRecap {
  const windowStart = addDays(now, -7);
  const recentWorkouts = workouts.filter((workout) => !workout.isBackfilled && new Date(workout.completedAt) >= windowStart);

  return {
    workoutCount: recentWorkouts.length,
    prCount: recentWorkouts.reduce((sum, workout) => sum + workout.prs.length, 0),
  };
}
