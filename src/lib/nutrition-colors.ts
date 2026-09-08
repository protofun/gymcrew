import { colors } from "@/theme";

/** One consistent accent color per macro/metric across every Nutrition screen — dashboard macro
 * cards, food detail stat tiles, meal builder totals, progress cards all read the same way instead
 * of each screen picking its own colors. */
export const NUTRITION_COLORS = {
  calories: colors.semantic.streak,
  protein: colors.semantic.success,
  carbs: colors.semantic.info,
  fat: colors.semantic.warning,
} as const;
