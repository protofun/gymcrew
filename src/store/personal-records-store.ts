import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MAJOR_LIFT_EXERCISE_IDS } from "@/lib/rank";

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: number;
  bestReps: number;
  achievedAt: number;
};

// Starter PRs — upper body maxed out, squat barely touched, on purpose: this is the account behind
// the "skips leg day" bit, and the muscle rank heatmap (member profile → Stats) is built to show it
// off at a glance. A real logged set that beats one of these overwrites it via `checkAndRecord`.
const DEFAULT_RECORDS: Record<string, PersonalRecord> = {
  [MAJOR_LIFT_EXERCISE_IDS.benchPress]: {
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.benchPress,
    exerciseName: "Bench Press",
    bestWeightKg: 195,
    bestReps: 2,
    achievedAt: Date.UTC(2026, 7, 17),
  },
  [MAJOR_LIFT_EXERCISE_IDS.deadlift]: {
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.deadlift,
    exerciseName: "Deadlift",
    bestWeightKg: 300,
    bestReps: 1,
    achievedAt: Date.UTC(2026, 7, 19),
  },
  [MAJOR_LIFT_EXERCISE_IDS.overheadPress]: {
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.overheadPress,
    exerciseName: "Overhead Press",
    bestWeightKg: 120,
    bestReps: 2,
    achievedAt: Date.UTC(2026, 7, 15),
  },
  [MAJOR_LIFT_EXERCISE_IDS.squat]: {
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.squat,
    exerciseName: "Squat",
    bestWeightKg: 20,
    bestReps: 8,
    achievedAt: Date.UTC(2026, 7, 5),
  },
};

type PrCheckResult = {
  isNewRecord: boolean;
  previousBestKg: number | null;
  /** When the previous best was set, so the celebration can show "2 weeks and 2 days since your last PR". */
  previousAchievedAt: number | null;
};

type PersonalRecordsStore = {
  /** Keyed by exerciseId — the heaviest completed set ever logged for that exercise. */
  records: Record<string, PersonalRecord>;
  /** Compares a lift against the stored best and updates it if this one is heavier. */
  checkAndRecord: (exerciseId: string, exerciseName: string, weightKg: number, reps: number) => PrCheckResult;
};

export const usePersonalRecordsStore = create<PersonalRecordsStore>()(
  persist(
    (set, get) => ({
      records: DEFAULT_RECORDS,
      checkAndRecord: (exerciseId, exerciseName, weightKg, reps) => {
        const previous = get().records[exerciseId];
        const previousBestKg = previous?.bestWeightKg ?? null;
        const previousAchievedAt = previous?.achievedAt ?? null;
        const isNewRecord = previousBestKg === null || weightKg > previousBestKg;

        if (isNewRecord) {
          set((state) => ({
            records: {
              ...state.records,
              [exerciseId]: { exerciseId, exerciseName, bestWeightKg: weightKg, bestReps: reps, achievedAt: Date.now() },
            },
          }));
        }

        return { isNewRecord, previousBestKg, previousAchievedAt };
      },
    }),
    {
      name: "gymcrew-personal-records",
      storage: createJSONStorage(() => AsyncStorage),
      // A plain shallow merge would let an already-persisted `records` object (even one missing
      // some of the four major lifts, e.g. from before DEFAULT_RECORDS existed) replace the whole
      // thing and drop the starter meme data. This merges per-lift instead — DEFAULT_RECORDS is the
      // floor, but a real logged PR for that same lift still wins since it's spread on top.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PersonalRecordsStore> | undefined) ?? {};
        return {
          ...currentState,
          ...persisted,
          records: { ...DEFAULT_RECORDS, ...(persisted.records ?? {}) },
        };
      },
    },
  ),
);
