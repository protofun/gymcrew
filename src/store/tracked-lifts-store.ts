import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { LiftCardId } from "@/data/rank-lifts";

type TrackedLiftsData = {
  /** Exercise-library ids for lifts the user added beyond the 9 built-in ones. */
  customExerciseIds: string[];
  /** Which of the 9 built-in lifts the user removed from their overview. */
  removedDefaultIds: LiftCardId[];
};

type TrackedLiftsStore = TrackedLiftsData & {
  addCustomLift: (exerciseId: string) => void;
  removeCustomLift: (exerciseId: string) => void;
  removeDefaultLift: (id: LiftCardId) => void;
  restoreDefaultLift: (id: LiftCardId) => void;
  syncFromServer: () => Promise<void>;
};

function syncPush(get: () => TrackedLiftsData) {
  const { customExerciseIds, removedDefaultIds } = get();
  pushState("tracked-lifts", { customExerciseIds, removedDefaultIds });
}

export const useTrackedLiftsStore = create<TrackedLiftsStore>()(
  persist(
    (set, get) => ({
      customExerciseIds: [],
      removedDefaultIds: [],
      addCustomLift: (exerciseId) => {
        set((state) => (state.customExerciseIds.includes(exerciseId) ? state : { customExerciseIds: [...state.customExerciseIds, exerciseId] }));
        syncPush(get);
      },
      removeCustomLift: (exerciseId) => {
        set((state) => ({ customExerciseIds: state.customExerciseIds.filter((id) => id !== exerciseId) }));
        syncPush(get);
      },
      removeDefaultLift: (id) => {
        set((state) => (state.removedDefaultIds.includes(id) ? state : { removedDefaultIds: [...state.removedDefaultIds, id] }));
        syncPush(get);
      },
      restoreDefaultLift: (id) => {
        set((state) => ({ removedDefaultIds: state.removedDefaultIds.filter((removedId) => removedId !== id) }));
        syncPush(get);
      },
      syncFromServer: () => pullState<TrackedLiftsData>("tracked-lifts", (data) => set(data)),
    }),
    {
      name: "gymcrew-tracked-lifts",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
