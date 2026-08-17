import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CustomWorkout = {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: number;
};

type CustomWorkoutsStore = {
  /** Newest first. */
  workouts: CustomWorkout[];
  addWorkout: (name: string, exerciseIds: string[]) => void;
  updateWorkout: (id: string, name: string, exerciseIds: string[]) => void;
  removeWorkout: (id: string) => void;
};

export const useCustomWorkoutsStore = create<CustomWorkoutsStore>()(
  persist(
    (set) => ({
      workouts: [],
      addWorkout: (name, exerciseIds) =>
        set((state) => ({
          workouts: [{ id: `custom-workout-${Date.now()}`, name, exerciseIds, createdAt: Date.now() }, ...state.workouts],
        })),
      updateWorkout: (id, name, exerciseIds) =>
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id === id ? { ...w, name, exerciseIds } : w)),
        })),
      removeWorkout: (id) => set((state) => ({ workouts: state.workouts.filter((w) => w.id !== id) })),
    }),
    {
      name: "gymcrew-custom-workouts",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
