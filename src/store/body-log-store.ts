import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";
import { DEMO_BODY_LOG } from "@/lib/demo-seed";

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
      entries: DEMO_BODY_LOG,
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
      // A brand new account ships with a year of weekly demo weigh-ins (see lib/demo-seed.ts) so
      // the Body Log chart isn't empty — the moment a real entry exists, it always wins. Once a
      // backend is configured, `syncFromServer` takes over as the real source of truth.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<BodyLogStore> | undefined) ?? {};
        return {
          ...currentState,
          ...persisted,
          entries: persisted.entries && persisted.entries.length > 0 ? persisted.entries : currentState.entries,
        };
      },
    },
  ),
);
