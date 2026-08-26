import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

type TodayTrainingData = {
  /** YYYY-MM-DD the override below applies to — overrides silently expire once the date rolls over. */
  overrideDate: string | null;
  /** null = no override (fall back to the weekly schedule); "" = explicitly marked as a rest day; else a workout name. */
  overrideWorkoutName: string | null;
};

type TodayTrainingState = TodayTrainingData & {
  setTodayOverride: (workoutName: string) => void;
  clearTodayOverride: () => void;
  syncFromServer: () => Promise<void>;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useTodayTrainingStore = create<TodayTrainingState>()(
  persist(
    (set) => ({
      overrideDate: null,
      overrideWorkoutName: null,
      setTodayOverride: (workoutName) => {
        const next = { overrideDate: todayKey(), overrideWorkoutName: workoutName };
        set(next);
        pushState("today-training", next);
      },
      clearTodayOverride: () => {
        const next = { overrideDate: null, overrideWorkoutName: null };
        set(next);
        pushState("today-training", next);
      },
      syncFromServer: () => pullState<TodayTrainingData>("today-training", (data) => set(data)),
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
