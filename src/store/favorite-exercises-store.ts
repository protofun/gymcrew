import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

type FavoriteExercisesStore = {
  favoriteIds: string[];
  toggleFavorite: (exerciseId: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useFavoriteExercisesStore = create<FavoriteExercisesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      toggleFavorite: (exerciseId) => {
        const favoriteIds = get().favoriteIds.includes(exerciseId)
          ? get().favoriteIds.filter((id) => id !== exerciseId)
          : [...get().favoriteIds, exerciseId];
        set({ favoriteIds });
        pushState("favorite-exercises", { favoriteIds });
      },
      syncFromServer: () => pullState<{ favoriteIds: string[] }>("favorite-exercises", (data) => set(data)),
    }),
    {
      name: "gymcrew-favorite-exercises",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
