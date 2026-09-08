import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { LiftCardId } from "@/data/rank-lifts";

type TrackedLiftsData = {
  /** Exercise-library ids the user explicitly pinned beyond the Ranks tab's auto-curated top 12
   * (see lib/ranks-board.ts) — always shown regardless of rank, even with no record yet (a
   * placeholder inviting you to start logging it). */
  customExerciseIds: string[];
  /** Which of the 9 built-in lifts the user removed from their overview. */
  removedDefaultIds: LiftCardId[];
  /** Any exercise id explicitly hidden from the Ranks tab's auto-curated top 12 — unlike
   * `removedDefaultIds` (only the 9 named built-in lifts), this covers *any* exercise the
   * auto-curation can surface (see lib/ranks-board.ts's `ranksBoardCards`), since a great lift on
   * an untracked exercise can land in the top 12 purely from having a personal record. */
  hiddenAchievementIds: string[];
};

type TrackedLiftsStore = TrackedLiftsData & {
  addCustomLift: (exerciseId: string) => void;
  removeCustomLift: (exerciseId: string) => void;
  removeDefaultLift: (id: LiftCardId) => void;
  restoreDefaultLift: (id: LiftCardId) => void;
  hideAchievement: (exerciseId: string) => void;
  unhideAchievement: (exerciseId: string) => void;
  syncFromServer: () => Promise<void>;
};

function syncPush(get: () => TrackedLiftsData) {
  const { customExerciseIds, removedDefaultIds, hiddenAchievementIds } = get();
  pushState("tracked-lifts", { customExerciseIds, removedDefaultIds, hiddenAchievementIds });
}

export const useTrackedLiftsStore = create<TrackedLiftsStore>()(
  persist(
    (set, get) => ({
      customExerciseIds: [],
      removedDefaultIds: [],
      hiddenAchievementIds: [],
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
      hideAchievement: (exerciseId) => {
        set((state) => (state.hiddenAchievementIds.includes(exerciseId) ? state : { hiddenAchievementIds: [...state.hiddenAchievementIds, exerciseId] }));
        syncPush(get);
      },
      unhideAchievement: (exerciseId) => {
        set((state) => ({ hiddenAchievementIds: state.hiddenAchievementIds.filter((id) => id !== exerciseId) }));
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
