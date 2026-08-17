import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
        set({ exercises: [...get().exercises, exercise] });
        return exercise;
      },
    }),
    {
      name: "gymcrew-custom-exercises",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
