import { WEEKDAYS, type Weekday } from "@/data/weekdays";

/** Today's weekday — JS's `getDay()` is Sunday-first (0-6), WEEKDAYS is Monday-first. */
export function currentWeekday(): Weekday {
  const jsDay = new Date().getDay();
  return WEEKDAYS[(jsDay + 6) % 7];
}

/** The workout name scheduled for today, per the user's onboarding weekly schedule — or null on a rest day / if unset. */
export function todaysScheduledWorkout(weeklySchedule: Partial<Record<Weekday, string>> | undefined): string | null {
  if (!weeklySchedule) return null;
  return weeklySchedule[currentWeekday()] ?? null;
}
