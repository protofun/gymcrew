import type { BodyLogEntry } from "@/store/body-log-store";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A smoothed weekly rate of change (kg/week) instead of a raw day-to-day delta — day-to-day weight
 * swings from water/food/sodium are normal and not real progress, so NUTRITION.md section 27
 * explicitly asks for a trend, not the latest jump. Compares the average of the most recent week's
 * entries against the average of the week before, which cancels out single noisy readings on either
 * side. Returns null when there isn't at least ~2 weeks of history to compare.
 */
export function weeklyWeightTrendKg(entries: BodyLogEntry[], now: number = Date.now()): number | null {
  if (entries.length < 2) return null;

  const recentWeek = entries.filter((entry) => entry.loggedAt > now - WEEK_MS);
  const priorWeek = entries.filter((entry) => entry.loggedAt <= now - WEEK_MS && entry.loggedAt > now - 2 * WEEK_MS);
  if (recentWeek.length === 0 || priorWeek.length === 0) return null;

  const average = (list: BodyLogEntry[]) => list.reduce((sum, entry) => sum + entry.weightKg, 0) / list.length;
  return Math.round((average(recentWeek) - average(priorWeek)) * 100) / 100;
}
