import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: number;
  bestReps: number;
  achievedAt: number;
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
      records: {},
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
    },
  ),
);
