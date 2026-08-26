import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

type WorkoutNotesStore = {
  /** Keyed by the session's date (yyyy-mm-dd via toDateKey). */
  notesByDate: Record<string, string>;
  setNote: (dateKey: string, note: string) => void;
  syncFromServer: () => Promise<void>;
};

export const useWorkoutNotesStore = create<WorkoutNotesStore>()(
  persist(
    (set, get) => ({
      notesByDate: {},
      setNote: (dateKey, note) => {
        const notesByDate = { ...get().notesByDate, [dateKey]: note };
        set({ notesByDate });
        pushState("workout-notes", { notesByDate });
      },
      syncFromServer: () => pullState<{ notesByDate: Record<string, string> }>("workout-notes", (data) => set(data)),
    }),
    {
      name: "gymcrew-workout-notes",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
