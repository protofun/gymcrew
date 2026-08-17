import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MuscleGroup } from "@/data/workout-log";
import type { WorkoutPr } from "@/lib/workout-finish";
import type { LoggedExercise, WeightUnit } from "@/store/active-workout-store";

export type CompletedWorkout = {
  id: string;
  name: string;
  completedAt: number;
  durationSeconds: number;
  unit: WeightUnit;
  notes: string;
  exercises: LoggedExercise[];
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
  volumeKg: number;
  completedSets: number;
  prs: WorkoutPr[];
};

type WorkoutHistoryStore = {
  /** Newest first. */
  workouts: CompletedWorkout[];
  addWorkout: (workout: CompletedWorkout) => void;
  updateWorkoutNotes: (id: string, notes: string) => void;
};

export const useWorkoutHistoryStore = create<WorkoutHistoryStore>()(
  persist(
    (set) => ({
      workouts: [],
      addWorkout: (workout) => set((state) => ({ workouts: [workout, ...state.workouts] })),
      updateWorkoutNotes: (id, notes) =>
        set((state) => ({
          workouts: state.workouts.map((workout) => (workout.id === id ? { ...workout, notes } : workout)),
        })),
    }),
    {
      name: "gymcrew-workout-history",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
