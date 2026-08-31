import { create } from "zustand";

import { api, type ApiCrewDuel, isApiConfigured } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

type CrewDuelState = {
  duels: ApiCrewDuel[];
};

type CrewDuelActions = {
  fetch: () => Promise<void>;
  propose: (opponentUserId: string, metric: "volume" | "sets", targetDateKey: string) => Promise<ActionResult>;
  respond: (duelId: string, accept: boolean) => Promise<ActionResult>;
};

/** 1-on-1 "who does more today" crewmate challenges (see backend/routes/crew-duels.php). Not
 * persisted — always cheap to refetch, same idea as crew-activity-store's per-crew fetch. */
export const useCrewDuelStore = create<CrewDuelState & CrewDuelActions>((set, get) => ({
  duels: [],

  fetch: async () => {
    if (!isApiConfigured) return;
    try {
      const duels = await api.getCrewDuels();
      set({ duels });
    } catch (error) {
      console.warn("Failed to fetch crew duels", error);
    }
  },

  propose: async (opponentUserId, metric, targetDateKey) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const duel = await api.createDuel({ opponentUserId, metric, targetDateKey });
      set({ duels: [duel, ...get().duels] });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  respond: async (duelId, accept) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const duel = await api.respondToDuel(duelId, accept);
      set({ duels: get().duels.map((existing) => (existing.id === duelId ? duel : existing)) });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },
}));
