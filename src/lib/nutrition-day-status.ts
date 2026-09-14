import type { Macros } from "@/lib/nutrition-macros";

export type DayGoalStatus = "hit" | "missed" | "no-data";

/** Was a logged day "on target"? Calories within ±15% of the goal AND protein at least 90% of the
 * goal — matches the same tolerance nutritionStatusFor already uses for its "right on target"
 * message, just reduced to a single yes/no for the calendar overview (see NUTRITION.md section 4's
 * "which days I did/didn't hit my goal"). A day with nothing logged is its own third state, never
 * counted as "missed" — no data isn't the same as falling short. */
export function dayGoalStatus(totals: Macros, targets: Macros): DayGoalStatus {
  if (totals.calories === 0 || targets.calories <= 0) return "no-data";
  const calorieRatio = totals.calories / targets.calories;
  const proteinRatio = targets.proteinG > 0 ? totals.proteinG / targets.proteinG : 1;
  const onTarget = calorieRatio >= 0.85 && calorieRatio <= 1.15 && proteinRatio >= 0.9;
  return onTarget ? "hit" : "missed";
}

/**
 * A continuous 0-1 "how healthy was this day" score — unlike `dayGoalStatus`'s 3-state read, this
 * is what the calendar's partial-progress ring fills to, and what the monthly trend line averages.
 * Calories score highest exactly on target and fall off the further either way they drift (so both
 * badly under- and over-eating read as low, not just going over); protein scores on a simple
 * ratio, capped at 1 (extra protein isn't a downside). The two are averaged evenly. `0` for a day
 * with nothing logged at all — "no data" reads the same as "not on track" for this score, since
 * unlike `dayGoalStatus` there's no separate empty ring state to fall back on.
 */
export function dayHealthinessRatio(totals: Macros, targets: Macros): number {
  if (totals.calories === 0 || targets.calories <= 0) return 0;
  const calorieRatio = totals.calories / targets.calories;
  const calorieScore = Math.max(0, 1 - Math.abs(1 - calorieRatio) * 2);
  const proteinRatio = targets.proteinG > 0 ? totals.proteinG / targets.proteinG : 1;
  const proteinScore = Math.min(1, proteinRatio);
  return Math.max(0, Math.min(1, (calorieScore + proteinScore) / 2));
}
