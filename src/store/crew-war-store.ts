import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, type ApiCrewWar, isApiConfigured } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

type CrewWarState = {
  war: ApiCrewWar | null;
  queued: boolean;
  loading: boolean;
  /** War ids whose win reward has already been granted — persisted so reopening the app after a
   * War resolves (or refreshing the tab again) never double-grants the bonus. */
  rewardedWarIds: string[];
};

type CrewWarActions = {
  /** Pulls this crew's current/most recent War + queue status — call on War tab focus. */
  refresh: () => Promise<void>;
  /** Leader/co-leader only. Joins matchmaking; resolves immediately to a War if a match was found. */
  joinQueue: () => Promise<ActionResult>;
  leaveQueue: () => Promise<void>;
  /** Best-effort, fire-and-forget — called right after finishing a workout (see workout/active.tsx). */
  recordContribution: (volumeKg: number) => void;
  markRewarded: (warId: string) => void;
};

export const useCrewWarStore = create<CrewWarState & CrewWarActions>()(
  persist(
    (set, get) => ({
      war: null,
      queued: false,
      loading: false,
      rewardedWarIds: [],

      refresh: async () => {
        if (!isApiConfigured) return;
        set({ loading: true });
        try {
          const { war, queued } = await api.getActiveWar();
          set({ war, queued, loading: false });
        } catch (error) {
          console.warn("Failed to fetch active crew War", error);
          set({ loading: false });
        }
      },

      joinQueue: async () => {
        if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
        try {
          const result = await api.queueForWar();
          if (result.status === "matched" && result.war) {
            set({ war: result.war, queued: false });
          } else {
            set({ queued: true });
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },

      leaveQueue: async () => {
        if (!isApiConfigured) return;
        set({ queued: false });
        try {
          await api.leaveWarQueue();
        } catch (error) {
          console.warn("Failed to leave War queue", error);
        }
      },

      recordContribution: (volumeKg) => {
        if (!isApiConfigured || volumeKg <= 0 || !get().war || get().war?.status !== "active") return;
        api.contributeToWar(volumeKg).catch((error) => console.warn("Failed to record War contribution", error));
      },

      markRewarded: (warId) => set((state) => ({ rewardedWarIds: [...state.rewardedWarIds, warId] })),
    }),
    {
      name: "gymcrew-crew-war",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
