import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type LedWorkoutSession = {
  leaderId: string;
  leaderName: string;
  workoutName: string;
  /** Exercise ids, in order — looked up in EXERCISE_BY_ID for display, so followers never need a duplicated copy. */
  exerciseIds: string[];
  participantIds: string[];
  startedAt: number;
};

type LedWorkoutStore = {
  session: LedWorkoutSession | null;
  startSession: (leaderId: string, leaderName: string, workoutName: string, exerciseIds: string[]) => void;
  join: (memberId: string) => void;
  endSession: () => void;
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
    (set) => ({
      session: DEFAULT_SESSION,
      startSession: (leaderId, leaderName, workoutName, exerciseIds) =>
        set({ session: { leaderId, leaderName, workoutName, exerciseIds, participantIds: [leaderId], startedAt: Date.now() } }),
      join: (memberId) =>
        set((state) => {
          if (!state.session || state.session.participantIds.includes(memberId)) return {};
          return { session: { ...state.session, participantIds: [...state.session.participantIds, memberId] } };
        }),
      endSession: () => set({ session: null }),
    }),
    {
      name: "gymcrew-led-workout",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
