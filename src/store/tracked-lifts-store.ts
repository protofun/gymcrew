import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { LiftCardId } from "@/data/rank-lifts";

type TrackedLiftsStore = {
  /** Exercise-library ids for lifts the user added beyond the 9 built-in ones. */
  customExerciseIds: string[];
  /** Which of the 9 built-in lifts the user removed from their overview. */
  removedDefaultIds: LiftCardId[];
  addCustomLift: (exerciseId: string) => void;
  removeCustomLift: (exerciseId: string) => void;
  removeDefaultLift: (id: LiftCardId) => void;
  restoreDefaultLift: (id: LiftCardId) => void;
};

export const useTrackedLiftsStore = create<TrackedLiftsStore>()(
  persist(
    (set) => ({
      customExerciseIds: [],
      removedDefaultIds: [],
      addCustomLift: (exerciseId) =>
        set((state) => (state.customExerciseIds.includes(exerciseId) ? state : { customExerciseIds: [...state.customExerciseIds, exerciseId] })),
      removeCustomLift: (exerciseId) =>
        set((state) => ({ customExerciseIds: state.customExerciseIds.filter((id) => id !== exerciseId) })),
      removeDefaultLift: (id) =>
        set((state) => (state.removedDefaultIds.includes(id) ? state : { removedDefaultIds: [...state.removedDefaultIds, id] })),
      restoreDefaultLift: (id) => set((state) => ({ removedDefaultIds: state.removedDefaultIds.filter((removedId) => removedId !== id) })),
    }),
    {
      name: "gymcrew-tracked-lifts",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
