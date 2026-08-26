import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

export type LedWorkoutSession = {
  leaderId: string;
  leaderName: string;
  workoutName: string;
  /** Exercise ids, in order — looked up in EXERCISE_BY_ID for display, so followers never need a duplicated copy. */
  exerciseIds: string[];
  participantIds: string[];
  startedAt: number;
};

type LedWorkoutSyncedState = {
  session: LedWorkoutSession | null;
};

type LedWorkoutStore = LedWorkoutSyncedState & {
  startSession: (leaderId: string, leaderName: string, workoutName: string, exerciseIds: string[]) => void;
  join: (memberId: string) => void;
  endSession: () => void;
  syncFromServer: () => Promise<void>;
};

// Seeded so "Join a Workout" has something real to show before the user ever leads one themselves.
const DEFAULT_SESSION: LedWorkoutSession = {
  leaderId: "m2",
  leaderName: "Sam",
  workoutName: "Push Day",
  exerciseIds: ["Barbell_Bench_Press_-_Medium_Grip", "Barbell_Shoulder_Press", "Triceps_Pushdown"],
  participantIds: ["m2", "m4"],
  startedAt: Date.now(),
};

export const useLedWorkoutStore = create<LedWorkoutStore>()(
  persist(
    (set, get) => ({
      session: DEFAULT_SESSION,
      startSession: (leaderId, leaderName, workoutName, exerciseIds) => {
        const session = { leaderId, leaderName, workoutName, exerciseIds, participantIds: [leaderId], startedAt: Date.now() };
        set({ session });
        pushState("led-workout", { session });
      },
      join: (memberId) => {
        set((state) => {
          if (!state.session || state.session.participantIds.includes(memberId)) return {};
          return { session: { ...state.session, participantIds: [...state.session.participantIds, memberId] } };
        });
        pushState("led-workout", { session: get().session });
      },
      endSession: () => {
        set({ session: null });
        pushState("led-workout", { session: null });
      },
      syncFromServer: () => pullState<LedWorkoutSyncedState>("led-workout", (data) => set(data)),
    }),
    {
      name: "gymcrew-led-workout",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
