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
  /** True when logged for an earlier day via "Log a Past Workout" (see active-workout-store's
   * `logDateKey`) rather than the day it was actually entered. Backfilled workouts still show up in
   * history/heatmap/volume for accurate personal tracking, but are excluded everywhere points or
   * rank can be earned — XP, streaks, PRs, Crew War, and crew challenges — since otherwise anyone
   * could fill in every past day and rack up rewards for training that was never verified same-day. */
  isBackfilled: boolean;
};

type WorkoutHistoryStore = {
  /** Newest first. */
  workouts: CompletedWorkout[];
  /** Ids of workouts whose initial `createWorkout` push hasn't been confirmed to reach the server
   * yet (e.g. logged with bad gym wifi) — see `retryPendingSync`. Without tracking this, a workout
   * that only ever existed locally would silently vanish the moment `syncFromServer` next replaces
   * local state with the server's (which never received it). */
  pendingSyncIds: string[];
  addWorkout: (workout: CompletedWorkout) => void;
  updateWorkoutNotes: (id: string, notes: string) => void;
  /** Re-attempts `createWorkout` for every id still in `pendingSyncIds` — safe to call anytime
   * (idempotent server-side: `workouts.id` is the primary key, so re-sending the same workout just
   * upserts it). Called on every `syncFromServer` before pulling, and can be called on its own too. */
  retryPendingSync: () => Promise<void>;
  /** Pulls the real backend state once a backend is configured and reachable — see body-log-store's
   * `syncFromServer` for the same "backend wins on success, otherwise keep local data" rule. Any
   * workout still in `pendingSyncIds` after a retry attempt is kept on top of the server's list
   * instead of being silently dropped, since the server genuinely doesn't have it yet. */
  syncFromServer: () => Promise<void>;
};

export const useWorkoutHistoryStore = create<WorkoutHistoryStore>()(
  persist(
    (set, get) => ({
      workouts: [],
      pendingSyncIds: [],
      addWorkout: (workout) => {
        set((state) => ({ workouts: [workout, ...state.workouts] }));
        if (isApiConfigured) {
          set((state) => ({ pendingSyncIds: [...state.pendingSyncIds, workout.id] }));
          api
            .createWorkout(workout)
            .then(() => set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((id) => id !== workout.id) })))
            .catch((error) => console.warn("Failed to sync new workout to server, will retry on next app open", error));
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
      retryPendingSync: async () => {
        if (!isApiConfigured) return;
        for (const id of get().pendingSyncIds) {
          const workout = get().workouts.find((w) => w.id === id);
          if (!workout) {
            set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((pendingId) => pendingId !== id) }));
            continue;
          }
          try {
            await api.createWorkout(workout);
            set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((pendingId) => pendingId !== id) }));
          } catch (error) {
            console.warn("Retry failed for pending workout, will try again later", error);
          }
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        await get().retryPendingSync();
        try {
          const serverWorkouts = await api.getWorkouts();
          const stillPending = get().pendingSyncIds;
          const serverIds = new Set(serverWorkouts.map((w) => w.id));
          const notYetOnServer = get().workouts.filter((w) => stillPending.includes(w.id) && !serverIds.has(w.id));
          const merged = [...notYetOnServer, ...serverWorkouts].sort((a, b) => b.completedAt - a.completedAt);
          set({ workouts: merged });
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
