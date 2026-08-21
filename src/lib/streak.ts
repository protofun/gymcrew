import { fromDateKey, getCurrentWeekDates, toDateKey } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * Consecutive trained days leading up to today. Today not having a workout yet doesn't break the
 * streak — the day isn't over — so counting only stops once a full day is skipped.
 */
export function computeCurrentStreak(workouts: CompletedWorkout[], now: Date = new Date()): number {
  const trainedDays = new Set(workouts.map((workout) => toDateKey(new Date(workout.completedAt))));

  const cursor = new Date(now);
  if (!trainedDays.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!trainedDays.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (trainedDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Monday-first trained/untrained flags for the current week, for the week-progress strip. */
export function computeTrainedDaysThisWeek(workouts: CompletedWorkout[], now: Date = new Date()): boolean[] {
  const trainedDays = new Set(workouts.map((workout) => toDateKey(new Date(workout.completedAt))));
  return getCurrentWeekDates(now).map((date) => trainedDays.has(toDateKey(date)));
}

/** The longest run of consecutive trained days across all logged history, ever — not just the
 * streak leading up to today (see `computeCurrentStreak`). */
export function computeLongestStreak(workouts: CompletedWorkout[]): number {
  if (workouts.length === 0) return 0;

  const trainedDayKeys = [...new Set(workouts.map((workout) => toDateKey(new Date(workout.completedAt))))].sort();

  let longest = 1;
  let current = 1;
  for (let i = 1; i < trainedDayKeys.length; i++) {
    const previousDay = fromDateKey(trainedDayKeys[i - 1]);
    previousDay.setDate(previousDay.getDate() + 1);
    const isConsecutive = toDateKey(previousDay) === trainedDayKeys[i];
    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}
