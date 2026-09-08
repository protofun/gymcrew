import type { Food } from "@/data/nutrition-foods";

export type Macros = { calories: number; proteinG: number; carbsG: number; fatG: number };

/** Scales a food's per-serving macros to an arbitrary quantity of the same unit — e.g. 250g of a
 * food whose macros are given per 100g. Rounded to whole calories / one decimal on macros, matching
 * how the app already displays weight/reps (no false precision from raw division). */
export function scaleMacros(food: Pick<Food, "servingSize" | "calories" | "proteinG" | "carbsG" | "fatG">, quantity: number): Macros {
  const ratio = food.servingSize > 0 ? quantity / food.servingSize : 0;
  return {
    calories: Math.round(food.calories * ratio),
    proteinG: Math.round(food.proteinG * ratio * 10) / 10,
    carbsG: Math.round(food.carbsG * ratio * 10) / 10,
    fatG: Math.round(food.fatG * ratio * 10) / 10,
  };
}

export type ExtendedMacros = { fiberG: number | null; sugarG: number | null; saturatedFatG: number | null; sodiumMg: number | null };

/** Same scaling as `scaleMacros`, for the secondary nutrition fields (fiber/sugar/saturated
 * fat/sodium) — kept separate since those aren't part of the core `Macros` shape food_logs/meal
 * totals persist (see NUTRITION.md section 3's "more extensive nutrition info" ask on the food
 * detail screen, which is display-only, not something logged per entry). */
export function scaleExtendedMacros(
  food: Pick<Food, "servingSize" | "fiberG" | "sugarG" | "saturatedFatG" | "sodiumMg">,
  quantity: number,
): ExtendedMacros {
  const ratio = food.servingSize > 0 ? quantity / food.servingSize : 0;
  function scale(value: number | undefined, decimals: number): number | null {
    if (value === undefined) return null;
    const factor = 10 ** decimals;
    return Math.round(value * ratio * factor) / factor;
  }
  return {
    fiberG: scale(food.fiberG, 1),
    sugarG: scale(food.sugarG, 1),
    saturatedFatG: scale(food.saturatedFatG, 1),
    sodiumMg: scale(food.sodiumMg, 0),
  };
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: Math.round((total.proteinG + item.proteinG) * 10) / 10,
      carbsG: Math.round((total.carbsG + item.carbsG) * 10) / 10,
      fatG: Math.round((total.fatG + item.fatG) * 10) / 10,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function zeroMacros(): Macros {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}
