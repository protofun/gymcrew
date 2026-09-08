import { create } from "zustand";

import { api, type ApiCrewLiveSession, isApiConfigured } from "@/lib/api";
import type { LoggedExercise } from "@/store/active-workout-store";

type ActionResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

type LedWorkoutState = {
  session: ApiCrewLiveSession | null;
  loading: boolean;
};

type LedWorkoutActions = {
  /** Pulls the crew's current live session — call on focus, and poll on an interval while the
   * Join screen is open (no websockets in this backend, see crew-live-sessions.php). */
  refresh: () => Promise<void>;
  /** Called the moment the leader starts their own workout — no pre-built exercise list required,
   * an empty one is fine, `pushExercises` mirrors it as they actually log. */
  startSession: (workoutName: string, exercises: LoggedExercise[]) => Promise<ActionResult>;
  /** Best-effort, fire-and-forget — called on every meaningful change to the leader's own
   * active-workout-store exercises (see workout/active.tsx). No-ops if not currently leading. */
  pushExercises: (exercises: LoggedExercise[]) => void;
  join: () => Promise<ActionResult>;
  endSession: () => void;
};

export const useLedWorkoutStore = create<LedWorkoutState & LedWorkoutActions>()((set, get) => ({
  session: null,
  loading: false,

  refresh: async () => {
    if (!isApiConfigured) return;
    set({ loading: true });
    try {
      const { session } = await api.getActiveLiveSession();
      set({ session, loading: false });
    } catch (error) {
      console.warn("Failed to fetch crew live session", error);
      set({ loading: false });
    }
  },

  startSession: async (workoutName, exercises) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const { session } = await api.startLiveSession(workoutName, exercises);
      set({ session });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  pushExercises: (exercises) => {
    if (!isApiConfigured || !get().session) return;
    api.updateLiveSessionExercises(exercises).catch((error) => console.warn("Failed to sync live session exercises", error));
  },

  join: async () => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    try {
      const { session } = await api.joinLiveSession();
      set({ session });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  },

  endSession: () => {
    set({ session: null });
    if (!isApiConfigured) return;
    api.endLiveSession().catch((error) => console.warn("Failed to end crew live session", error));
  },
}));
