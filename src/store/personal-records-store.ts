import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api, isApiConfigured } from "@/lib/api";
import { DEMO_RECORDS } from "@/lib/demo-seed";

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: number;
  bestReps: number;
  achievedAt: number;
};

// Starter PRs, one per exercise in the year-long demo history (see lib/demo-seed.ts) — a fresh
// account's Ranks tab and Achievements page already look like real, established progress instead
// of empty. A real logged set that beats one of these overwrites it via `checkAndRecord`.
const DEFAULT_RECORDS: Record<string, PersonalRecord> = DEMO_RECORDS;

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
