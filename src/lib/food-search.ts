import type { Food } from "@/data/nutrition-foods";

/** Filters a user's own custom foods by name/brand — the only foods that ever live purely
 * client-side (see data/nutrition-foods.ts's doc comment for why there's no bundled catalog here).
 * The real database, Open Food Facts, is searched separately over the network (see
 * lib/api.ts's `searchOpenFoodFacts`, used debounced in nutrition/add.tsx). */
export function searchCustomFoods(query: string, customFoods: Food[]): Food[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return customFoods;
  return customFoods.filter((food) => food.name.toLowerCase().includes(trimmed) || food.brand?.toLowerCase().includes(trimmed));
}

export function foodsById(foods: Food[]): Record<string, Food> {
  return Object.fromEntries(foods.map((food) => [food.id, food]));
}
