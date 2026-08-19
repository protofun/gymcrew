import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type TodayTrainingState = {
  /** YYYY-MM-DD the override below applies to — overrides silently expire once the date rolls over. */
  overrideDate: string | null;
  /** null = no override (fall back to the weekly schedule); "" = explicitly marked as a rest day; else a workout name. */
  overrideWorkoutName: string | null;
  setTodayOverride: (workoutName: string) => void;
  clearTodayOverride: () => void;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useTodayTrainingStore = create<TodayTrainingState>()(
  persist(
    (set) => ({
      overrideDate: null,
      overrideWorkoutName: null,
      setTodayOverride: (workoutName) => set({ overrideDate: todayKey(), overrideWorkoutName: workoutName }),
      clearTodayOverride: () => set({ overrideDate: null, overrideWorkoutName: null }),
    }),
    {
      name: "gymcrew-today-training",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** The active override for today, or null if it's stale (from a previous day) or unset. */
export function activeTodayOverride(state: { overrideDate: string | null; overrideWorkoutName: string | null }): string | null {
  if (state.overrideDate !== todayKey()) return null;
  return state.overrideWorkoutName;
}
