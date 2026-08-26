import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";

export type BodyLogEntry = {
  id: string;
  loggedAt: number;
  weightKg: number;
  bodyFatPercent: number | null;
};

type BodyLogStore = {
  /** Newest first. */
  entries: BodyLogEntry[];
  addEntry: (entry: Omit<BodyLogEntry, "id" | "loggedAt">) => void;
  removeEntry: (id: string) => void;
  /** Pulls the real backend state once a backend is configured and reachable — on success this
   * always wins over local/demo data (an empty list back from a real backend means genuinely no
   * entries yet, which is more honest than keeping the local demo seed around). Silently keeps the
   * existing local state if the backend isn't configured or isn't reachable. */
  syncFromServer: () => Promise<void>;
};

export const useBodyLogStore = create<BodyLogStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => {
        const newEntry: BodyLogEntry = { ...entry, id: `body-log-${Date.now()}`, loggedAt: Date.now() };
        set((state) => ({ entries: [newEntry, ...state.entries] }));
        if (isApiConfigured) {
          api.addBodyLogEntry(entry).catch((error) => console.warn("Failed to sync new body log entry to server", error));
        }
      },
      removeEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
        if (isApiConfigured) {
          api.removeBodyLogEntry(id).catch((error) => console.warn("Failed to sync removed body log entry to server", error));
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const entries = await api.getBodyLog();
          set({ entries });
        } catch (error) {
          console.warn("Failed to sync body log from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-body-log",
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped once to hard-discard any locally cached demo/seed weigh-ins from before this app
      // stopped shipping fake weekly entries by default — only real entries and whatever the
      // database actually has (via `syncFromServer`) count from here on.
      version: 1,
      migrate: () => ({ entries: [] }),
    },
  ),
);
