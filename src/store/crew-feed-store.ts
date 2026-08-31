import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, type ApiCrewActivityEvent, type CrewActivityEventType, isApiConfigured } from "@/lib/api";

type CrewFeedState = {
  events: ApiCrewActivityEvent[];
  /** Persisted so the unread badge (see NotificationsDropdown wiring) survives an app restart. */
  lastSeenAt: number;
};

type CrewFeedActions = {
  fetch: () => Promise<void>;
  markSeen: () => void;
  /** Best-effort, fire-and-forget — called right after detecting a PR/streak/long session/division
   * up (see workout/active.tsx and profile-level-store.ts). */
  logEvent: (eventType: CrewActivityEventType, payload: Record<string, unknown>) => void;
};

export const useCrewFeedStore = create<CrewFeedState & CrewFeedActions>()(
  persist(
    (set) => ({
      events: [],
      lastSeenAt: 0,

      fetch: async () => {
        if (!isApiConfigured) return;
        try {
          const events = await api.getCrewActivityEvents();
          set({ events });
        } catch (error) {
          console.warn("Failed to fetch crew activity feed", error);
        }
      },

      markSeen: () => set({ lastSeenAt: Date.now() }),

      logEvent: (eventType, payload) => {
        if (!isApiConfigured) return;
        api.logCrewActivityEvent(eventType, payload).catch((error) => console.warn("Failed to log crew activity event", error));
      },
    }),
    {
      name: "gymcrew-crew-feed",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
