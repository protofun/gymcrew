import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, type ApiCrewWar, isApiConfigured } from "@/lib/api";

type CrewWarState = {
  war: ApiCrewWar | null;
  loading: boolean;
  /** War ids whose win reward has already been granted — persisted so reopening the app after a
   * War resolves (or refreshing the tab again) never double-grants the bonus. */
  rewardedWarIds: string[];
};

type CrewWarActions = {
  /** Pulls this crew's current War — the backend guarantees one always exists (auto-starts one,
   * real match or bot fallback, the moment there isn't an active one), so there's no "queued" or
   * "no War yet" state to handle client-side anymore. Call on War tab focus. */
  refresh: () => Promise<void>;
  /** Records one attack from a just-finished workout — best-effort, fire-and-forget (see
   * workout/active.tsx). No-op below zero volume. */
  attack: (volumeKg: number, prCount: number, workoutName: string) => Promise<{ score: number } | null>;
  markRewarded: (warId: string) => void;
};

export const useCrewWarStore = create<CrewWarState & CrewWarActions>()(
  persist(
    (set) => ({
      war: null,
      loading: false,
      rewardedWarIds: [],

      refresh: async () => {
        if (!isApiConfigured) return;
        set({ loading: true });
        try {
          const { war } = await api.getActiveWar();
          set({ war, loading: false });
        } catch (error) {
          console.warn("Failed to fetch active crew War", error);
          set({ loading: false });
        }
      },

      attack: async (volumeKg, prCount, workoutName) => {
        if (!isApiConfigured || volumeKg <= 0) return null;
        try {
          const result = await api.attackInWar(volumeKg, prCount, workoutName);
          if (!result.attacked || result.score === undefined) return null;
          // Re-pull the War so the local score/feed reflect this attack immediately, not just on
          // the next tab focus.
          const { war } = await api.getActiveWar();
          set({ war });
          return { score: result.score };
        } catch (error) {
          console.warn("Failed to record War attack", error);
          return null;
        }
      },

      markRewarded: (warId) => set((state) => ({ rewardedWarIds: [...state.rewardedWarIds, warId] })),
    }),
    {
      name: "gymcrew-crew-war",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
