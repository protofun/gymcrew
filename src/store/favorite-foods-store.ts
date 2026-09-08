import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

type FavoriteFoodsStore = {
  favoriteIds: string[];
  toggleFavorite: (foodId: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useFavoriteFoodsStore = create<FavoriteFoodsStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (foodId) => {
        const favoriteIds = get().favoriteIds.includes(foodId)
          ? get().favoriteIds.filter((id) => id !== foodId)
          : [...get().favoriteIds, foodId];
        set({ favoriteIds });
        pushState("favorite-foods", { favoriteIds });
      },
      syncFromServer: () => pullState<{ favoriteIds: string[] }>("favorite-foods", (data) => set(data)),
    }),
    {
      name: "gymcrew-favorite-foods",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
