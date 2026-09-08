import type { ApiFoodLog } from "@/lib/api";

/** The most recently logged distinct foods (one row per food, most recent quantity/unit) — powers
 * "Recently Added" one-tap quick logging (see NUTRITION.md section 8). Meal/shake log rows are
 * excluded here; My Meals already covers one-tap re-logging for those. */
export function recentFoodLogs(entries: ApiFoodLog[], limit = 5): ApiFoodLog[] {
  const seen = new Set<string>();
  const result: ApiFoodLog[] = [];
  for (const entry of [...entries].sort((a, b) => b.loggedAt - a.loggedAt)) {
    if (!entry.foodId || entry.mealId) continue;
    if (seen.has(entry.foodId)) continue;
    seen.add(entry.foodId);
    result.push(entry);
    if (result.length >= limit) break;
  }
  return result;
}
