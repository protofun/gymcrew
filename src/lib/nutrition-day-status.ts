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
