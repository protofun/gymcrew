import { create } from "zustand";

import { api, type ApiCrewMemberActivity, isApiConfigured } from "@/lib/api";

type CrewActivityStore = {
  /** Keyed by real Clerk user id — see crew-store.ts's normalizeCrew for why other members keep
   * their real id while your own row is remapped to CURRENT_MEMBER_ID. Deliberately NOT persisted:
   * this is always refetched per crew id rather than cached, so a crewmate's brand new workout
   * shows up without needing a manual refresh mechanism. */
  membersActivity: Record<string, ApiCrewMemberActivity>;
  fetchedForCrewId: string | null;
  fetchForCrew: (crewId: string) => Promise<void>;
};

export const useCrewActivityStore = create<CrewActivityStore>((set, get) => ({
  membersActivity: {},
  fetchedForCrewId: null,
  fetchForCrew: async (crewId) => {
    if (!isApiConfigured || !crewId || get().fetchedForCrewId === crewId) return;
    try {
      const { members } = await api.getCrewActivity(crewId);
      set({ membersActivity: members, fetchedForCrewId: crewId });
    } catch (error) {
      console.warn("Failed to fetch crew activity from server", error);
    }
  },
}));
