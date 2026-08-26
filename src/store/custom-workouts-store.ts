import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

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
  syncFromServer: () => Promise<void>;
};

export const useCustomWorkoutsStore = create<CustomWorkoutsStore>()(
  persist(
    (set, get) => ({
      workouts: [],
      addWorkout: (name, exerciseIds) => {
        const workouts = [{ id: `custom-workout-${Date.now()}`, name, exerciseIds, createdAt: Date.now() }, ...get().workouts];
        set({ workouts });
        pushState("custom-workouts", { workouts });
      },
      updateWorkout: (id, name, exerciseIds) => {
        const workouts = get().workouts.map((w) => (w.id === id ? { ...w, name, exerciseIds } : w));
        set({ workouts });
        pushState("custom-workouts", { workouts });
      },
      removeWorkout: (id) => {
        const workouts = get().workouts.filter((w) => w.id !== id);
        set({ workouts });
        pushState("custom-workouts", { workouts });
      },
      syncFromServer: () => pullState<{ workouts: CustomWorkout[] }>("custom-workouts", (data) => set(data)),
    }),
    {
      name: "gymcrew-custom-workouts",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
