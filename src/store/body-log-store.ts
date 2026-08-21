import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
};

export const useBodyLogStore = create<BodyLogStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [{ ...entry, id: `body-log-${Date.now()}`, loggedAt: Date.now() }, ...state.entries],
        })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) })),
    }),
    {
      name: "gymcrew-body-log",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
