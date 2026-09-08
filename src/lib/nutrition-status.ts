import type { Macros } from "@/lib/nutrition-macros";

export type NutritionStatus = { emoji: string; label: string; detail: string };

/** Today's status line under the macro overview (see NUTRITION.md section 22/30) — always
 * encouraging, never guilt-tripping about a missed target, same "motivation, not shame" rule the
 * app already applies to workout streaks. */
export function nutritionStatusFor(totals: Macros, targets: Macros): NutritionStatus {
  if (targets.calories <= 0) {
    return { emoji: "🍽️", label: "Set your targets", detail: "Add your daily goals to see how today's tracking." };
  }

  const calorieRatio = totals.calories / targets.calories;
  const proteinRatio = targets.proteinG > 0 ? totals.proteinG / targets.proteinG : 0;

  if (totals.calories === 0) {
    return { emoji: "🥗", label: "Nothing logged yet", detail: "Add your first meal to start tracking today." };
  }
  if (proteinRatio >= 1 && calorieRatio <= 1.05) {
    return { emoji: "🔥", label: "Protein locked in", detail: "You've hit your protein goal for the day." };
  }
  if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
    return { emoji: "⚡", label: "Right on target", detail: "You're tracking close to your calorie goal today." };
  }
  if (calorieRatio > 1.1) {
    return { emoji: "💪", label: "Above target today", detail: "A bit over your calorie goal — no big deal, keep it consistent." };
  }
  if (proteinRatio >= 0.7) {
    return { emoji: "👍", label: "Great job", detail: "You're on track to hit your protein goal." };
  }
  return { emoji: "🥩", label: "Keep fueling", detail: "Get some more protein in to stay on track today." };
}
