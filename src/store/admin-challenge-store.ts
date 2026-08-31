import { create } from "zustand";

import { api, type AdminChallengeInput, type ApiAdminChallenge, isApiConfigured } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

type AdminChallengeState = {
  /** Every challenge for the admin account, active-only for everyone else — see
   * backend/routes/admin-challenges.php. Not persisted locally: always cheap to refetch, and stale
   * admin edits (e.g. another session toggling a challenge off) shouldn't linger. */
  challenges: ApiAdminChallenge[];
  fetched: boolean;
  fetch: () => Promise<void>;
  create: (data: AdminChallengeInput) => Promise<ActionResult>;
  update: (id: string, data: Partial<AdminChallengeInput>) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
};

export const useAdminChallengeStore = create<AdminChallengeState>((set, get) => ({
  challenges: [],
  fetched: false,

  fetch: async () => {
    if (!isApiConfigured) return;
    try {
      const challenges = await api.getAdminChallenges();
      set({ challenges, fetched: true });
    } catch (error) {
      console.warn("Failed to fetch admin challenges", error);
    }
  },

  create: async (data) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const challenge = await api.createAdminChallenge(data);
      set({ challenges: [challenge, ...get().challenges] });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  update: async (id, data) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const challenge = await api.updateAdminChallenge(id, data);
      set({ challenges: get().challenges.map((existing) => (existing.id === id ? challenge : existing)) });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  remove: async (id) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      await api.deleteAdminChallenge(id);
      set({ challenges: get().challenges.filter((existing) => existing.id !== id) });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },
}));
