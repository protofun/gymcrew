import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured, type ApiFoodLog, type CreateFoodLogInput } from "@/lib/api";
import { toDateKey } from "@/lib/date";

const SYNC_WINDOW_DAYS = 90;

function localId(): string {
  return `food-log-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function mergeEntries(current: ApiFoodLog[], incoming: ApiFoodLog[]): ApiFoodLog[] {
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) byId.set(entry.id, entry);
  return Array.from(byId.values()).sort((a, b) => b.loggedAt - a.loggedAt);
}

type NutritionLogStore = {
  /** Every locally-known entry, across whatever date ranges have been fetched (see `fetchRange`) —
   * not strictly "all history", so History/Progress screens should call `fetchRange` for whatever
   * window they're about to show rather than assuming it's already loaded. */
  entries: ApiFoodLog[];
  addEntry: (input: Omit<CreateFoodLogInput, "id" | "loggedAt">) => ApiFoodLog;
  removeEntry: (id: string) => void;
  /** Pulls the last ~90 days on sign-in — enough for the dashboard, recent-history graphs, and
   * "recently added"/streak logic without pulling a whole account's food history up front. */
  syncFromServer: () => Promise<void>;
  /** Pulls a specific date range (e.g. a wider History window) and merges it into `entries`. */
  fetchRange: (startKey: string, endKey: string) => Promise<void>;
  /** Duplicates yesterday's (or any day's) entries onto another day — see NUTRITION.md section 32. */
  copyDay: (fromDateKey: string, toDateKey: string) => Promise<void>;
};

export const useNutritionLogStore = create<NutritionLogStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (input) => {
        const entry: ApiFoodLog = { ...input, id: localId(), loggedAt: Date.now() };
        set((state) => ({ entries: mergeEntries(state.entries, [entry]) }));
        if (isApiConfigured) {
          api.addFoodLog(entry).catch((error) => console.warn("Failed to sync new food log entry to server", error));
        }
        return entry;
      },
      removeEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
        if (isApiConfigured) {
          api.removeFoodLog(id).catch((error) => console.warn("Failed to sync removed food log entry to server", error));
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const endKey = toDateKey(new Date());
          const startKey = toDateKey(new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000));
          const entries = await api.getFoodLogsByRange(startKey, endKey);
          set({ entries });
        } catch (error) {
          console.warn("Failed to sync food log from server, keeping local data", error);
        }
      },
      fetchRange: async (startKey, endKey) => {
        if (!isApiConfigured) return;
        try {
          const entries = await api.getFoodLogsByRange(startKey, endKey);
          set((state) => ({ entries: mergeEntries(state.entries, entries) }));
        } catch (error) {
          console.warn("Failed to fetch food log range from server", error);
        }
      },
      copyDay: async (fromKey, toKey) => {
        const source = get().entries.filter((entry) => entry.dateKey === fromKey);
        if (source.length === 0) return;

        if (isApiConfigured) {
          try {
            const copied = await api.copyFoodLogDay(fromKey, toKey);
            set((state) => ({ entries: mergeEntries(state.entries, copied) }));
            return;
          } catch (error) {
            console.warn("Failed to copy day on server, copying locally only", error);
          }
        }

        const copied = source.map((entry) => ({ ...entry, id: localId(), dateKey: toKey, loggedAt: Date.now() }));
        set((state) => ({ entries: mergeEntries(state.entries, copied) }));
      },
    }),
    {
      name: "gymcrew-nutrition-log",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
