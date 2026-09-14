import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Exercise } from "@/data/exercises";
import { pullState, pushState } from "@/lib/backend-sync";
import { toDateKey } from "@/lib/date";
import { getLastPerformance } from "@/lib/exercise-history";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

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
  /** The calendar day (yyyy-mm-dd) this workout is being logged for — defaults to today. Set to an
   * earlier date via the Log tab's "Log a Past Workout" flow to backfill a missed day; see
   * workout/active.tsx's `isBackfilled` check, which skips XP/streaks/PRs/Crew War for that day. */
  logDateKey: string;
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
  setLogDateKey: (dateKey: string) => void;
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
  /** Pulls this account's in-progress workout draft from the backend — so starting the app on a
   * different device (or after clearing local storage) can resume a workout you're mid-way through
   * logging, not just whatever's cached on this one device. */
  syncFromServer: () => Promise<void>;
};

/** Everything about the draft that's worth resuming on another device — deliberately excludes
 * nothing here, since even mid-set values (unfinished weight/reps) are worth not losing. */
type ActiveWorkoutSyncedState = Pick<
  ActiveWorkoutStore,
  "startedAt" | "logDateKey" | "name" | "notes" | "unit" | "exercises" | "restEndTime" | "restDurationSeconds" | "autoFillPreviousSet"
>;

function initialState(): Pick<ActiveWorkoutStore, "startedAt" | "logDateKey" | "name" | "notes" | "unit" | "exercises" | "restEndTime"> {
  return { startedAt: null, logDateKey: toDateKey(new Date()), name: "", notes: "", unit: "kg", exercises: [], restEndTime: null };
}

function syncPush(get: () => ActiveWorkoutStore) {
  const { startedAt, logDateKey, name, notes, unit, exercises, restEndTime, restDurationSeconds, autoFillPreviousSet } = get();
  pushState("active-workout", { startedAt, logDateKey, name, notes, unit, exercises, restEndTime, restDurationSeconds, autoFillPreviousSet });
}

export const useActiveWorkoutStore = create<ActiveWorkoutStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      restDurationSeconds: 90,
      autoFillPreviousSet: true,

      // Defaults to the user's Profile > Units preference rather than always "kg". A no-op when a
      // workout is already in progress — every "Start Workout" button on Home/Log calls this
      // unconditionally, so without this guard, leaving the app mid-workout (backgrounding it,
      // closing the tab) and then tapping "Start Workout" again to get back in would silently wipe
      // everything logged so far instead of resuming it.
      startWorkout: () => {
        if (get().startedAt !== null) return;
        set({ ...initialState(), unit: useOnboardingStore.getState().weightUnit, startedAt: Date.now() });
        syncPush(get);
      },
      discardWorkout: () => {
        set(initialState());
        syncPush(get);
      },
      finishWorkout: () => {
        set(initialState());
        syncPush(get);
      },
      setLogDateKey: (logDateKey) => {
        set({ logDateKey });
        syncPush(get);
      },
      setName: (name) => {
        set({ name });
        syncPush(get);
      },
      setNotes: (notes) => {
        set({ notes });
        syncPush(get);
      },
      setUnit: (unit) => {
        set({ unit });
        syncPush(get);
      },
      setRestDurationSeconds: (seconds) => {
        set({ restDurationSeconds: seconds });
        syncPush(get);
      },
      setAutoFillPreviousSet: (enabled) => {
        set({ autoFillPreviousSet: enabled });
        syncPush(get);
      },

      startRest: () => {
        const duration = get().restDurationSeconds;
        if (duration <= 0) return;
        set({ restEndTime: Date.now() + duration * 1000 });
        syncPush(get);
      },
      stopRest: () => {
        set({ restEndTime: null });
        syncPush(get);
      },
      addRestSeconds: (seconds) => {
        set((state) => {
          if (state.restEndTime === null) return {};
          return { restEndTime: Math.max(Date.now(), state.restEndTime + seconds * 1000) };
        });
        syncPush(get);
      },

      addExercise: (exercise) => {
        // Prefills set #1 from the last time this exercise was logged (not just the same-session
        // "set above" auto-fill `addSet` already does below) — so repeating last week's numbers
        // doesn't mean retyping them. Skips warmup sets when picking what to copy; falls back to
        // the first logged set if every set that session was a warmup.
        const lastSets = get().autoFillPreviousSet
          ? getLastPerformance(useWorkoutHistoryStore.getState().workouts, exercise.id)
          : null;
        const prefillFrom = lastSets ? (lastSets.find((loggedSet) => !loggedSet.isWarmup) ?? lastSets[0]) : undefined;
        set((state) => ({ exercises: [...state.exercises, toLoggedExercise(exercise, [makeSet(prefillFrom)])] }));
        syncPush(get);
      },

      removeExercise: (exerciseId) => {
        set((state) => ({ exercises: state.exercises.filter((e) => e.exerciseId !== exerciseId) }));
        syncPush(get);
      },

      replaceExercise: (exerciseId, exercise) => {
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? toLoggedExercise(exercise, e.sets) : e,
          ),
        }));
        syncPush(get);
      },

      setExerciseNote: (exerciseId, note) => {
        set((state) => ({
          exercises: state.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, note } : e)),
        }));
        syncPush(get);
      },

      addSet: (exerciseId) => {
        set((state) => ({
          exercises: state.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            const previousSet = state.autoFillPreviousSet ? e.sets[e.sets.length - 1] : undefined;
            return { ...e, sets: [...e.sets, makeSet(previousSet)] };
          }),
        }));
        syncPush(get);
      },

      removeSet: (exerciseId, setId) => {
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
          ),
        }));
        syncPush(get);
      },

      updateSet: (exerciseId, setId, updates) => {
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
        });
        syncPush(get);
      },

      syncFromServer: () => pullState<ActiveWorkoutSyncedState>("active-workout", (data) => set(data)),
    }),
    {
      name: "gymcrew-active-workout",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
