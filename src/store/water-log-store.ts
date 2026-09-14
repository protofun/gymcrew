import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured, type ApiWaterLog } from "@/lib/api";
import { toDateKey } from "@/lib/date";

const SYNC_WINDOW_DAYS = 90;

function localId(): string {
  return `water-log-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function mergeEntries(current: ApiWaterLog[], incoming: ApiWaterLog[]): ApiWaterLog[] {
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  for (const entry of incoming) byId.set(entry.id, entry);
  return Array.from(byId.values()).sort((a, b) => b.loggedAt - a.loggedAt);
}

type WaterLogStore = {
  entries: ApiWaterLog[];
  addEntry: (amountMl: number, dateKey: string) => void;
  /** Removes the most recently logged entry for a day — the "undo" a quick-add flow needs, since
   * water has no per-entry detail screen to edit/delete from individually. */
  removeLast: (dateKey: string) => void;
  syncFromServer: () => Promise<void>;
  fetchRange: (startKey: string, endKey: string) => Promise<void>;
};

export const useWaterLogStore = create<WaterLogStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (amountMl, dateKey) => {
        const entry: ApiWaterLog = { id: localId(), amountMl, dateKey, loggedAt: Date.now() };
        set((state) => ({ entries: mergeEntries(state.entries, [entry]) }));
        if (isApiConfigured) {
          api.addWaterLog(entry).catch((error) => console.warn("Failed to sync new water log entry to server", error));
        }
      },
      removeLast: (dateKey) => {
        const dayEntries = get().entries.filter((entry) => entry.dateKey === dateKey);
        const last = dayEntries[0]; // already sorted newest-first
        if (!last) return;
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== last.id) }));
        if (isApiConfigured) {
          api.removeWaterLog(last.id).catch((error) => console.warn("Failed to sync removed water log entry to server", error));
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const endKey = toDateKey(new Date());
          const startKey = toDateKey(new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000));
          const entries = await api.getWaterLogsByRange(startKey, endKey);
          set({ entries });
        } catch (error) {
          console.warn("Failed to sync water log from server, keeping local data", error);
        }
      },
      fetchRange: async (startKey, endKey) => {
        if (!isApiConfigured) return;
        try {
          const entries = await api.getWaterLogsByRange(startKey, endKey);
          set((state) => ({ entries: mergeEntries(state.entries, entries) }));
        } catch (error) {
          console.warn("Failed to fetch water log range from server", error);
        }
      },
    }),
    {
      name: "gymcrew-water-log",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
