import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type WorkoutNotesStore = {
  /** Keyed by the session's date (yyyy-mm-dd via toDateKey). */
  notesByDate: Record<string, string>;
  setNote: (dateKey: string, note: string) => void;
};

export const useWorkoutNotesStore = create<WorkoutNotesStore>()(
  persist(
    (set) => ({
      notesByDate: {},
      setNote: (dateKey, note) => set((state) => ({ notesByDate: { ...state.notesByDate, [dateKey]: note } })),
    }),
    {
      name: "gymcrew-workout-notes",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
