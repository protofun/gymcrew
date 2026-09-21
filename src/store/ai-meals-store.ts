import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

/** One ingredient of a scanned meal, as logged — the grams and the macros of that whole portion. */
export type AiMealItem = {
  id: string;
  name: string;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** A meal logged from a photo (see app/nutrition/scan-meal.tsx). The food log holds ONE entry for it
 * (its `foodId` is `ai-meal:<id>`, see lib/ai-meals.ts); this record is what makes that entry openable:
 * the photo and the separate ingredients. Synced as a generic user-state blob, so no backend table. */
export type AiMeal = {
  id: string;
  /** The uploaded photo's URL — or the phone's local file until the upload has gone through. */
  photoUrl: string;
  items: AiMealItem[];
  createdAt: number;
};

type AiMealsData = { meals: Record<string, AiMeal> };

type AiMealsStore = AiMealsData & {
  setMeal: (meal: AiMeal) => void;
  setPhotoUrl: (id: string, photoUrl: string) => void;
  removeMeal: (id: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useAiMealsStore = create<AiMealsStore>()(
  persist(
    (set, get) => {
      function commit(meals: Record<string, AiMeal>) {
        set({ meals });
        pushState("ai-meals", { meals });
      }

      return {
        meals: {},
        setMeal: (meal) => commit({ ...get().meals, [meal.id]: meal }),
        setPhotoUrl: (id, photoUrl) => {
          const meal = get().meals[id];
          if (meal) commit({ ...get().meals, [id]: { ...meal, photoUrl } });
        },
        removeMeal: (id) => {
          const { [id]: _removed, ...rest } = get().meals;
          commit(rest);
        },
        syncFromServer: () => pullState<AiMealsData>("ai-meals", (data) => set({ meals: data.meals ?? {} })),
      };
    },
    {
      name: "gymcrew-ai-meals",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
