import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";

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
  /** Compares a lift against the stored best and updates it if this one is heavier. Stays
   * synchronous (callers use the return value immediately) — a new record also fires a background
   * sync to the backend, not awaited. */
  checkAndRecord: (exerciseId: string, exerciseName: string, weightKg: number, reps: number) => PrCheckResult;
  /** Pulls the real backend state once a backend is configured and reachable — see body-log-store's
   * `syncFromServer` for the same "backend wins on success, otherwise keep local data" rule. */
  syncFromServer: () => Promise<void>;
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
          if (isApiConfigured) {
            api.checkAndRecord({ exerciseId, exerciseName, weightKg, reps }).catch((error) =>
              console.warn("Failed to sync new PR to server", error),
            );
          }
        }

        return { isNewRecord, previousBestKg, previousAchievedAt };
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const records = await api.getRecords();
          set({ records });
        } catch (error) {
          console.warn("Failed to sync personal records from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-personal-records",
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped once to hard-discard any locally cached demo/seed records from before this app
      // stopped shipping fake starter PRs by default — only real logged PRs and whatever the
      // database actually has (via `syncFromServer`) count from here on.
      version: 1,
      migrate: () => ({ records: {} }),
    },
  ),
);
