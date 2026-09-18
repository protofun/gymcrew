import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, type ApiCrewActivityEvent, type CrewActivityEventType, type CrewActivityReactionEmoji, isApiConfigured } from "@/lib/api";
import { toggleReactionOptimistic } from "@/lib/crew-feed";

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
  /** Toggle the caller's reaction to one event — updates `events` immediately (optimistic), then
   * reconciles with the server's real summary, or reverts if the request fails. */
  react: (eventId: number, emoji: CrewActivityReactionEmoji) => void;
};

export const useCrewFeedStore = create<CrewFeedState & CrewFeedActions>()(
  persist(
    (set, get) => ({
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

      react: (eventId, emoji) => {
        if (!isApiConfigured) return;
        const target = get().events.find((event) => event.id === eventId);
        if (!target) return;
        const previousReactions = target.reactions;

        set({
          events: get().events.map((event) =>
            event.id === eventId ? { ...event, reactions: toggleReactionOptimistic(event.reactions, emoji) } : event,
          ),
        });

        api
          .reactToCrewActivityEvent(eventId, emoji)
          .then(({ reactions }) => {
            set({ events: get().events.map((event) => (event.id === eventId ? { ...event, reactions } : event)) });
          })
          .catch((error) => {
            console.warn("Failed to react to crew activity event", error);
            set({ events: get().events.map((event) => (event.id === eventId ? { ...event, reactions: previousReactions } : event)) });
          });
      },
    }),
    {
      name: "gymcrew-crew-feed",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
