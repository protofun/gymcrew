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
  /** Pulls this crew's current War — `null` when it has none right now and its
   * `warAutoMatchEnabled` setting is off (see crew-store.ts), otherwise the backend auto-starts one
   * (real match or bot fallback) the moment there isn't an active one. Call on War tab focus. */
  refresh: () => Promise<void>;
  /** Leader/co-leader only: explicitly starts (or matches into) a War right now, regardless of
   * the crew's auto-match setting — see backend/routes/crew-wars.php's handleStartWar. Used by the
   * "Start War" empty state once auto-match is off, or by a leader who just wants one immediately. */
  startWar: () => Promise<ActionResult>;
  /** Records one attack from a just-finished workout — best-effort, fire-and-forget (see
   * workout/active.tsx). No-op below zero volume. */
  attack: (volumeKg: number, prCount: number, workoutName: string) => Promise<{ score: number } | null>;
  markRewarded: (warId: string) => void;
};

type ActionResult = { ok: true } | { ok: false; error: string };

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

      startWar: async () => {
        if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
        try {
          const { war } = await api.startWar();
          set({ war });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : "Could not start a War right now." };
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
