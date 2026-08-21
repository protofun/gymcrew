import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Exercise } from "@/data/exercises";
import { useOnboardingStore } from "@/store/onboarding-store";

export type WeightUnit = "kg" | "lbs";

export type LoggedSet = {
  id: string;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  isWarmup: boolean;
};

export type LoggedExercise = {
  exerciseId: string;
  name: string;
  imageUrl: string;
  primaryMuscle: string;
  note: string;
  sets: LoggedSet[];
};

function makeSet(prefillFrom?: LoggedSet): LoggedSet {
  return {
    id: `set-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    weightKg: prefillFrom?.weightKg ?? null,
    reps: prefillFrom?.reps ?? null,
    completed: false,
    isWarmup: false,
  };
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
  /** Epoch ms the current rest period ends, or null when no rest is running. Resets with the workout. */
  restEndTime: number | null;
  /** How long a rest period lasts once started — a standalone preference, not reset with the workout. */
  restDurationSeconds: number;
  /** When adding a new set, prefill it with the set above's weight/reps — a standalone preference, not reset with the workout. */
  autoFillPreviousSet: boolean;
  startWorkout: () => void;
  discardWorkout: () => void;
  finishWorkout: () => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  setUnit: (unit: WeightUnit) => void;
  setRestDurationSeconds: (seconds: number) => void;
  setAutoFillPreviousSet: (enabled: boolean) => void;
  startRest: () => void;
  stopRest: () => void;
  addRestSeconds: (seconds: number) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  replaceExercise: (exerciseId: string, exercise: Exercise) => void;
  setExerciseNote: (exerciseId: string, note: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Omit<LoggedSet, "id">>) => void;
};

function initialState(): Pick<ActiveWorkoutStore, "startedAt" | "name" | "notes" | "unit" | "exercises" | "restEndTime"> {
  return { startedAt: null, name: "", notes: "", unit: "kg", exercises: [], restEndTime: null };
}

export const useActiveWorkoutStore = create<ActiveWorkoutStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      restDurationSeconds: 90,
      autoFillPreviousSet: true,

      // Defaults to the user's Profile > Units preference rather than always "kg".
      startWorkout: () => set({ ...initialState(), unit: useOnboardingStore.getState().weightUnit, startedAt: Date.now() }),
      discardWorkout: () => set(initialState()),
      finishWorkout: () => set(initialState()),
      setName: (name) => set({ name }),
      setNotes: (notes) => set({ notes }),
      setUnit: (unit) => set({ unit }),
      setRestDurationSeconds: (seconds) => set({ restDurationSeconds: seconds }),
      setAutoFillPreviousSet: (enabled) => set({ autoFillPreviousSet: enabled }),

      startRest: () => {
        const duration = get().restDurationSeconds;
        if (duration <= 0) return;
        set({ restEndTime: Date.now() + duration * 1000 });
      },
      stopRest: () => set({ restEndTime: null }),
      addRestSeconds: (seconds) =>
        set((state) => {
          if (state.restEndTime === null) return {};
          return { restEndTime: Math.max(Date.now(), state.restEndTime + seconds * 1000) };
        }),

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
          exercises: state.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            const previousSet = state.autoFillPreviousSet ? e.sets[e.sets.length - 1] : undefined;
            return { ...e, sets: [...e.sets, makeSet(previousSet)] };
          }),
        })),

      removeSet: (exerciseId, setId) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
          ),
        })),

      updateSet: (exerciseId, setId, updates) =>
        set((state) => {
          // Marking a (non-warmup) set complete auto-starts the rest timer — the whole point is to
          // not have to think about it between sets. Warm-ups don't need a full rest, so they're
          // excluded, same as they're excluded from volume/PR calculations (see lib/workout-finish.ts).
          let restEndTime = state.restEndTime;
          if (updates.completed === true) {
            const currentSet = state.exercises.find((e) => e.exerciseId === exerciseId)?.sets.find((s) => s.id === setId);
            if (currentSet && !currentSet.completed && !currentSet.isWarmup && state.restDurationSeconds > 0) {
              restEndTime = Date.now() + state.restDurationSeconds * 1000;
            }
          }

          return {
            restEndTime,
            exercises: state.exercises.map((e) =>
              e.exerciseId === exerciseId
                ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)) }
                : e,
            ),
          };
        }),
    }),
    {
      name: "gymcrew-active-workout",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
