import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MuscleGroup } from "@/data/workout-log";
import type { RankTier } from "@/lib/rank";

type CustomMuscleRanksState = {
  /** Manually assigned per muscle group — see ranks/build-your-graph.tsx. Purely a sandbox for
   * producing an arbitrary body graph for marketing; never derived from real lift data and never
   * synced to the backend, same "local-only, fake for screenshots" spirit as developer-mode-store.ts. */
  tiersByGroup: Partial<Record<MuscleGroup, RankTier>>;
};

type CustomMuscleRanksActions = {
  setGroupTier: (group: MuscleGroup, tier: RankTier) => void;
  clearGroupTier: (group: MuscleGroup) => void;
  clearAll: () => void;
};

export const useCustomMuscleRanksStore = create<CustomMuscleRanksState & CustomMuscleRanksActions>()(
  persist(
    (set) => ({
      tiersByGroup: {},
      setGroupTier: (group, tier) => set((state) => ({ tiersByGroup: { ...state.tiersByGroup, [group]: tier } })),
      clearGroupTier: (group) =>
        set((state) => {
          const rest = { ...state.tiersByGroup };
          delete rest[group];
          return { tiersByGroup: rest };
        }),
      clearAll: () => set({ tiersByGroup: {} }),
    }),
    {
      name: "gymcrew-custom-muscle-ranks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
