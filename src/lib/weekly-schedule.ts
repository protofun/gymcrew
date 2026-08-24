import { WEEKDAYS, type Weekday } from "@/data/weekdays";

/** Today's weekday — JS's `getDay()` is Sunday-first (0-6), WEEKDAYS is Monday-first. */
export function currentWeekday(): Weekday {
  const jsDay = new Date().getDay();
  return WEEKDAYS[(jsDay + 6) % 7];
}

/**
 * The workout name scheduled for today, per the user's weekly schedule — `null` if today has no
 * entry at all (falls back to the crew's default plan), or `""` for an explicit rest day (distinct
 * from "unset" — see `use-today-workout.ts`, which is the only place that distinction matters).
 */
export function todaysScheduledWorkout(weeklySchedule: Partial<Record<Weekday, string>> | undefined): string | null {
  if (!weeklySchedule) return null;
  const today = currentWeekday();
  return today in weeklySchedule ? (weeklySchedule[today] ?? null) : null;
}
