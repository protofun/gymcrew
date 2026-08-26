import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { MuscleGroup } from "@/data/workout-log";
import { api, isApiConfigured } from "@/lib/api";
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
  /** Pulls the real backend state once a backend is configured and reachable — see body-log-store's
   * `syncFromServer` for the same "backend wins on success, otherwise keep local data" rule. */
  syncFromServer: () => Promise<void>;
};

export const useWorkoutHistoryStore = create<WorkoutHistoryStore>()(
  persist(
    (set) => ({
      workouts: [],
      addWorkout: (workout) => {
        set((state) => ({ workouts: [workout, ...state.workouts] }));
        if (isApiConfigured) {
          api.createWorkout(workout).catch((error) => console.warn("Failed to sync new workout to server", error));
        }
      },
      updateWorkoutNotes: (id, notes) => {
        set((state) => ({
          workouts: state.workouts.map((workout) => (workout.id === id ? { ...workout, notes } : workout)),
        }));
        if (isApiConfigured) {
          api.updateWorkoutNotes(id, notes).catch((error) => console.warn("Failed to sync workout notes to server", error));
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const workouts = await api.getWorkouts();
          set({ workouts });
        } catch (error) {
          console.warn("Failed to sync workout history from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-workout-history",
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped once to hard-discard any locally cached demo/seed history from before this app
      // stopped shipping fake "year of training" data by default — only real logged workouts and
      // whatever the database actually has (via `syncFromServer`) count from here on.
      version: 1,
      migrate: () => ({ workouts: [] }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<WorkoutHistoryStore> | undefined) ?? {};
        return {
          ...currentState,
          ...persisted,
          workouts: persisted.workouts && persisted.workouts.length > 0 ? persisted.workouts : currentState.workouts,
        };
      },
    },
  ),
);
