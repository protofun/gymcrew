import { useMemo } from "react";

import { toDateKey } from "@/lib/date";
import { sumMacros } from "@/lib/nutrition-macros";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";

/** Today's food against the daily targets — `null` targets until the person has set them, so nothing half-real is shown. */
export function useTodayNutrition() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const entries = useNutritionLogStore((state) => state.entries);
  const calorieTarget = useNutritionTargetsStore((state) => state.calories);
  const proteinTarget = useNutritionTargetsStore((state) => state.proteinG);
  const carbsTarget = useNutritionTargetsStore((state) => state.carbsG);
  const fatTarget = useNutritionTargetsStore((state) => state.fatG);

  const totals = useMemo(() => sumMacros(entries.filter((entry) => entry.dateKey === todayKey)), [entries, todayKey]);
  const hasTargets = calorieTarget !== null && proteinTarget !== null && carbsTarget !== null && fatTarget !== null;

  return {
    hasTargets,
    totals,
    calorieTarget: calorieTarget ?? 0,
    proteinTarget: proteinTarget ?? 0,
    carbsTarget: carbsTarget ?? 0,
    fatTarget: fatTarget ?? 0,
    /** 0–100+ */
    caloriePercent: calorieTarget ? (totals.calories / calorieTarget) * 100 : 0,
    proteinPercent: proteinTarget ? (totals.proteinG / proteinTarget) * 100 : 0,
    carbsPercent: carbsTarget ? (totals.carbsG / carbsTarget) * 100 : 0,
    fatPercent: fatTarget ? (totals.fatG / fatTarget) * 100 : 0,
  };
}
