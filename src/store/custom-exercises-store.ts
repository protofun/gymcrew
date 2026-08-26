import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";
import type { Exercise } from "@/data/exercises";
import type { MuscleGroup } from "@/data/workout-log";

type NewCustomExercise = {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: string | null;
};

type CustomExercisesStore = {
  exercises: Exercise[];
  addExercise: (input: NewCustomExercise) => Exercise;
  syncFromServer: () => Promise<void>;
};

export const useCustomExercisesStore = create<CustomExercisesStore>()(
  persist(
    (set, get) => ({
      exercises: [],
      addExercise: (input) => {
        const exercise: Exercise = {
          id: `custom-${Date.now()}`,
          name: input.name.trim(),
          category: "strength",
          level: "intermediate",
          equipment: input.equipment,
          primaryMuscles: [input.primaryMuscle],
          secondaryMuscles: input.secondaryMuscles,
          instructions: [],
          imageUrl: "",
        };
        const exercises = [...get().exercises, exercise];
        set({ exercises });
        pushState("custom-exercises", { exercises });
        return exercise;
      },
      syncFromServer: () => pullState<{ exercises: Exercise[] }>("custom-exercises", (data) => set(data)),
    }),
    {
      name: "gymcrew-custom-exercises",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
