import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Food } from "@/data/nutrition-foods";
import { pullState, pushState } from "@/lib/backend-sync";

type NewCustomFood = Omit<Food, "id" | "source">;

type CustomFoodsStore = {
  foods: Food[];
  addFood: (input: NewCustomFood) => Food;
  updateFood: (id: string, input: NewCustomFood) => void;
  removeFood: (id: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useCustomFoodsStore = create<CustomFoodsStore>()(
  persist(
    (set, get) => ({
      foods: [],
      addFood: (input) => {
        const food: Food = { ...input, id: `custom-food-${Date.now()}`, source: "user_created" };
        const foods = [...get().foods, food];
        set({ foods });
        pushState("custom-foods", { foods });
        return food;
      },
      updateFood: (id, input) => {
        const foods = get().foods.map((food) => (food.id === id ? { ...food, ...input } : food));
        set({ foods });
        pushState("custom-foods", { foods });
      },
      removeFood: (id) => {
        const foods = get().foods.filter((food) => food.id !== id);
        set({ foods });
        pushState("custom-foods", { foods });
      },
      syncFromServer: () => pullState<{ foods: Food[] }>("custom-foods", (data) => set(data)),
    }),
    {
      name: "gymcrew-custom-foods",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
