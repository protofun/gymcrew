import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Food } from "@/data/nutrition-foods";

type OffFoodsCacheStore = {
  /** Every Open Food Facts product this device has seen via search or barcode lookup, keyed by its
   * `off-<barcode>` id — lets food/[id].tsx (and favoriting/quick-add) resolve an OFF product
   * without needing to pass its whole payload through route params. The backend already caches the
   * canonical copy (see nutrition-off.php); this is just a local memo of what's been seen. */
  foods: Record<string, Food>;
  remember: (foods: Food[]) => void;
};

export const useOffFoodsCacheStore = create<OffFoodsCacheStore>()(
  persist(
    (set, get) => ({
      foods: {},
      remember: (foods) => {
        if (foods.length === 0) return;
        const next = { ...get().foods };
        for (const food of foods) next[food.id] = food;
        set({ foods: next });
      },
    }),
    {
      name: "gymcrew-off-foods-cache",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
