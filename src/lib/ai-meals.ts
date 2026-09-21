import { sumMacros, type Macros } from "@/lib/nutrition-macros";
import type { MealSlot } from "@/lib/meal-slot";
import { useAiMealsStore, type AiMealItem } from "@/store/ai-meals-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";

const FOOD_ID_PREFIX = "ai-meal:";

export function newAiMealId(): string {
  return `ai-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/** The food-log entry of an AI meal points at its record through `foodId` (an opaque string to the
 * backend), so the log stays one plain entry per meal. */
export function aiMealFoodId(id: string): string {
  return `${FOOD_ID_PREFIX}${id}`;
}

export function aiMealIdFromFoodId(foodId: string | null | undefined): string | null {
  return foodId?.startsWith(FOOD_ID_PREFIX) ? foodId.slice(FOOD_ID_PREFIX.length) : null;
}

/** "Chicken, Rice +2" — what the meal is called in Today's Food. */
export function aiMealTitle(items: AiMealItem[]): string {
  const names = items.slice(0, 2).map((item) => item.name);
  const rest = items.length - names.length;
  return names.join(", ") + (rest > 0 ? ` +${rest}` : "");
}

export function aiMealTotals(items: AiMealItem[]): Macros {
  return sumMacros(items);
}

/** Writes an AI meal to the log: its record in the AI meals store, and exactly ONE food-log entry for
 * the whole meal. Calling it again for the same meal replaces that entry rather than adding another —
 * that's what keeps edits (grams, a removed ingredient, another meal slot) from ever double-logging.
 * With no ingredients left it removes the meal completely. */
export function saveAiMealToLog(input: { id: string; photoUrl: string; items: AiMealItem[]; mealSlot: MealSlot; dateKey: string; createdAt?: number }): void {
  const log = useNutritionLogStore.getState();
  const foodId = aiMealFoodId(input.id);

  for (const entry of log.entries) {
    if (entry.foodId === foodId && entry.dateKey === input.dateKey) log.removeEntry(entry.id);
  }

  if (input.items.length === 0) {
    // Another day's copy of the same meal (see "Copy Previous Day") may still point at the record.
    const stillUsed = useNutritionLogStore.getState().entries.some((entry) => entry.foodId === foodId);
    if (!stillUsed) useAiMealsStore.getState().removeMeal(input.id);
    return;
  }

  log.addEntry({
    foodId,
    mealId: null,
    name: aiMealTitle(input.items),
    mealSlot: input.mealSlot,
    quantity: 1,
    unit: "meal",
    dateKey: input.dateKey,
    ...aiMealTotals(input.items),
  });
  useAiMealsStore.getState().setMeal({ id: input.id, photoUrl: input.photoUrl, items: input.items, createdAt: input.createdAt ?? Date.now() });
}

/** Removes a log entry, and the AI meal record behind it once no entry points at it any more. */
export function removeEntryWithAiMeal(entryId: string): void {
  const log = useNutritionLogStore.getState();
  const entry = log.entries.find((candidate) => candidate.id === entryId);
  log.removeEntry(entryId);

  const aiMealId = aiMealIdFromFoodId(entry?.foodId);
  if (!aiMealId) return;
  const stillUsed = useNutritionLogStore.getState().entries.some((candidate) => candidate.foodId === entry?.foodId);
  if (!stillUsed) useAiMealsStore.getState().removeMeal(aiMealId);
}
