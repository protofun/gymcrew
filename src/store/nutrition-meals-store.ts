import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured, type ApiMeal, type SaveMealInput } from "@/lib/api";

type NutritionMealsStore = {
  meals: ApiMeal[];
  /** Creates a new saved meal/shake when `input.id` is missing, otherwise updates the existing one
   * in place — same "use once vs. update saved meal" split the meal-builder UI needs (see
   * NUTRITION.md section 16), just decided here by whether an id was passed in. */
  saveMeal: (input: SaveMealInput) => ApiMeal;
  removeMeal: (id: string) => void;
  syncFromServer: () => Promise<void>;
};

function localId(): string {
  return `meal-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export const useNutritionMealsStore = create<NutritionMealsStore>()(
  persist(
    (set, get) => ({
      meals: [],
      saveMeal: (input) => {
        const now = Date.now();
        const existing = input.id ? get().meals.find((meal) => meal.id === input.id) : undefined;
        const meal: ApiMeal = {
          ...input,
          id: input.id ?? localId(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        set((state) => ({
          meals: existing ? state.meals.map((m) => (m.id === meal.id ? meal : m)) : [meal, ...state.meals],
        }));

        if (isApiConfigured) {
          const save = existing ? api.updateNutritionMeal(meal.id, meal) : api.createNutritionMeal(meal);
          save.catch((error) => console.warn("Failed to sync meal to server", error));
        }
        return meal;
      },
      removeMeal: (id) => {
        set((state) => ({ meals: state.meals.filter((meal) => meal.id !== id) }));
        if (isApiConfigured) {
          api.deleteNutritionMeal(id).catch((error) => console.warn("Failed to sync removed meal to server", error));
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const meals = await api.getNutritionMeals();
          set({ meals });
        } catch (error) {
          console.warn("Failed to sync meals from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-nutrition-meals",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
