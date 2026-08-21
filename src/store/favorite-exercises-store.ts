import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FavoriteExercisesStore = {
  favoriteIds: string[];
  toggleFavorite: (exerciseId: string) => void;
};

export const useFavoriteExercisesStore = create<FavoriteExercisesStore>()(
  persist(
    (set) => ({
      favoriteIds: [],
      toggleFavorite: (exerciseId) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(exerciseId)
            ? state.favoriteIds.filter((id) => id !== exerciseId)
            : [...state.favoriteIds, exerciseId],
        })),
    }),
    {
      name: "gymcrew-favorite-exercises",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
