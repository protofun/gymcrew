import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Exercise } from "@/data/exercises";

export type WeightUnit = "kg" | "lbs";

export type LoggedSet = {
  id: string;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
};

export type LoggedExercise = {
  exerciseId: string;
  name: string;
  imageUrl: string;
  primaryMuscle: string;
  note: string;
  sets: LoggedSet[];
};

function makeSet(): LoggedSet {
  return { id: `set-${Date.now()}-${Math.round(Math.random() * 1000)}`, weightKg: null, reps: null, completed: false };
}

function toLoggedExercise(exercise: Exercise, sets: LoggedSet[]): LoggedExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    imageUrl: exercise.imageUrl,
    primaryMuscle: exercise.primaryMuscles[0] ?? "",
    note: "",
    sets,
  };
}

type ActiveWorkoutStore = {
  /** Epoch ms the workout started, or null when no workout is in progress. */
  startedAt: number | null;
  name: string;
  notes: string;
  unit: WeightUnit;
  exercises: LoggedExercise[];
  startWorkout: () => void;
  discardWorkout: () => void;
  finishWorkout: () => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  setUnit: (unit: WeightUnit) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  replaceExercise: (exerciseId: string, exercise: Exercise) => void;
  setExerciseNote: (exerciseId: string, note: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Omit<LoggedSet, "id">>) => void;
};

function initialState(): Pick<ActiveWorkoutStore, "startedAt" | "name" | "notes" | "unit" | "exercises"> {
  return { startedAt: null, name: "", notes: "", unit: "kg", exercises: [] };
}

export const useActiveWorkoutStore = create<ActiveWorkoutStore>()(
  persist(
    (set) => ({
      ...initialState(),

      startWorkout: () => set({ ...initialState(), startedAt: Date.now() }),
      discardWorkout: () => set(initialState()),
      finishWorkout: () => set(initialState()),
      setName: (name) => set({ name }),
      setNotes: (notes) => set({ notes }),
      setUnit: (unit) => set({ unit }),

      addExercise: (exercise) =>
        set((state) => ({ exercises: [...state.exercises, toLoggedExercise(exercise, [makeSet()])] })),

      removeExercise: (exerciseId) =>
        set((state) => ({ exercises: state.exercises.filter((e) => e.exerciseId !== exerciseId) })),

      replaceExercise: (exerciseId, exercise) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? toLoggedExercise(exercise, e.sets) : e,
          ),
        })),

      setExerciseNote: (exerciseId, note) =>
        set((state) => ({
          exercises: state.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, note } : e)),
        })),

      addSet: (exerciseId) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, makeSet()] } : e,
          ),
        })),

      removeSet: (exerciseId, setId) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
          ),
        })),

      updateSet: (exerciseId, setId, updates) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId
              ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)) }
              : e,
          ),
        })),
    }),
    {
      name: "gymcrew-active-workout",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
