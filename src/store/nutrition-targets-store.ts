import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { Macros } from "@/lib/nutrition-macros";
import type { ActivityLevel, NutritionGoal } from "@/lib/nutrition-targets";

type NutritionTargetsData = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  goal: NutritionGoal | null;
  activityLevel: ActivityLevel | null;
  /** True once the user has manually edited a number rather than accepting the suggested calc — a
   * later profile change (weight, etc.) should never silently overwrite a deliberate override. */
  isCustom: boolean;
  /** A target bodyweight for the Progress screen (see NUTRITION.md section 24) — kept here rather
   * than a new store since it lives right alongside the other nutrition goal-setting fields. */
  goalWeightKg: number | null;
};

type NutritionTargetsStore = NutritionTargetsData & {
  /** Accepts a freshly calculated (or manually entered) set of targets — see nutrition/targets.tsx. */
  setTargets: (macros: Macros, goal: NutritionGoal, activityLevel: ActivityLevel, isCustom: boolean) => void;
  setGoalWeightKg: (weightKg: number | null) => void;
  syncFromServer: () => Promise<void>;
};

const EMPTY: NutritionTargetsData = {
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  goal: null,
  activityLevel: null,
  isCustom: false,
  goalWeightKg: null,
};

export const useNutritionTargetsStore = create<NutritionTargetsStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      setTargets: (macros, goal, activityLevel, isCustom) => {
        const data: NutritionTargetsData = {
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          goal,
          activityLevel,
          isCustom,
          goalWeightKg: get().goalWeightKg,
        };
        set(data);
        pushState("nutrition-targets", data);
      },
      setGoalWeightKg: (weightKg) => {
        set({ goalWeightKg: weightKg });
        const { calories, proteinG, carbsG, fatG, goal, activityLevel, isCustom } = get();
        pushState("nutrition-targets", { calories, proteinG, carbsG, fatG, goal, activityLevel, isCustom, goalWeightKg: weightKg });
      },
      syncFromServer: () => pullState<NutritionTargetsData>("nutrition-targets", (data) => set(data)),
    }),
    {
      name: "gymcrew-nutrition-targets",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
