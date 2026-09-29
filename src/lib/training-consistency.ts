import { toDateKey } from "@/lib/date";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** 0 = nothing logged that day, 1 = one workout, 2 = two or more — a GitHub-contribution-style scale,
 * not the muscle heatmap's 0-10 intensity, since this is about attendance (did you show up), not load. */
export type ConsistencyLevel = 0 | 1 | 2;

export type ConsistencyCell = { date: Date; dateKey: string; level: ConsistencyLevel };

/** One calendar year as Monday-start weeks (columns of 7 days, Mon..Sun) — the same shape a GitHub
 * contribution graph uses, so `TrainingConsistencyGrid` only has to lay out a grid, not compute one.
 * Padding days before Jan 1 or after Dec 31 (rounding the first/last week out to a full Monday-start
 * week) are `null`, same as `lib/date.ts`'s `getMonthGrid` does for a single month. */
export function buildConsistencyYear(year: number, workoutCountByDate: Map<string, number>): (ConsistencyCell | null)[][] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startOffset = (jan1.getDay() + 6) % 7; // Monday = 0
  let weekStart = new Date(year, 0, 1 - startOffset);

  const weeks: (ConsistencyCell | null)[][] = [];
  while (weekStart <= dec31) {
    const week: (ConsistencyCell | null)[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + day);
      if (date.getFullYear() !== year) {
        week.push(null);
        continue;
      }
      const dateKey = toDateKey(date);
      const count = workoutCountByDate.get(dateKey) ?? 0;
      const level: ConsistencyLevel = count >= 2 ? 2 : count === 1 ? 1 : 0;
      week.push({ date, dateKey, level });
    }
    weeks.push(week);
    weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  }
  return weeks;
}

/** How many real (non-backfilled... actually backfilled counts too — a logged day is a logged day
 * for attendance purposes) workouts landed on each date, across all of history. */
export function workoutCountByDate(workouts: CompletedWorkout[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    const key = toDateKey(new Date(workout.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Every year with at least one logged workout, most recent first — the current year always leads
 * even with nothing logged yet this year, so the page never opens looking empty/broken on Jan 1. */
export function yearsWithHistory(workouts: CompletedWorkout[], now: Date): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const workout of workouts) years.add(new Date(workout.completedAt).getFullYear());
  return [...years].sort((a, b) => b - a);
}
