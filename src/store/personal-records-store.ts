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
  /** exerciseIds whose latest PR push hasn't been confirmed to reach the server yet — see
   * `retryPendingSync`. Without tracking this, a PR that only ever existed locally would silently
   * be overwritten the moment `syncFromServer` next pulls the server's (older) best for that lift. */
  pendingSyncIds: string[];
  /** exerciseIds whose record was set locally by the Developer Tools (see lib/dev-tools.ts) — never
   * sent to the server; `syncFromServer` keeps them instead of overwriting them with the server's. */
  testRecordIds: string[];
  /** Compares a lift against the stored best and updates it if this one is heavier. Stays
   * synchronous (callers use the return value immediately) — a new record also fires a background
   * sync to the backend, not awaited. */
  checkAndRecord: (exerciseId: string, exerciseName: string, weightKg: number, reps: number) => PrCheckResult;
  /** Re-attempts the PR push for every exerciseId still in `pendingSyncIds` — safe to call anytime
   * (idempotent server-side: `/records` only ever keeps the heavier of the two). Called on every
   * `syncFromServer` before pulling, and can be called on its own too. */
  retryPendingSync: () => Promise<void>;
  /** Pulls the real backend state once a backend is configured and reachable — see body-log-store's
   * `syncFromServer` for the same "backend wins on success, otherwise keep local data" rule. A record
   * still in `pendingSyncIds` after a retry attempt is kept if it's genuinely heavier than whatever
   * the server returned, instead of being silently overwritten by a stale server value. */
  syncFromServer: () => Promise<void>;
};

export const usePersonalRecordsStore = create<PersonalRecordsStore>()(
  persist(
    (set, get) => ({
      records: {},
      pendingSyncIds: [],
      testRecordIds: [],
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
            set((state) => ({ pendingSyncIds: [...new Set([...state.pendingSyncIds, exerciseId])] }));
            api
              .checkAndRecord({ exerciseId, exerciseName, weightKg, reps })
              .then(() => set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((id) => id !== exerciseId) })))
              .catch((error) => console.warn("Failed to sync new PR to server, will retry on next app open", error));
          }
        }

        return { isNewRecord, previousBestKg, previousAchievedAt };
      },
      retryPendingSync: async () => {
        if (!isApiConfigured) return;
        for (const exerciseId of get().pendingSyncIds) {
          const record = get().records[exerciseId];
          if (!record) {
            set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((id) => id !== exerciseId) }));
            continue;
          }
          try {
            await api.checkAndRecord({
              exerciseId,
              exerciseName: record.exerciseName,
              weightKg: record.bestWeightKg,
              reps: record.bestReps,
            });
            set((state) => ({ pendingSyncIds: state.pendingSyncIds.filter((id) => id !== exerciseId) }));
          } catch (error) {
            console.warn("Retry failed for pending PR, will try again later", error);
          }
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        await get().retryPendingSync();
        try {
          const serverRecords = await api.getRecords();
          const merged = { ...serverRecords };
          const localRecords = get().records;
          for (const exerciseId of get().pendingSyncIds) {
            const local = localRecords[exerciseId];
            const server = serverRecords[exerciseId];
            if (local && (!server || local.bestWeightKg > server.bestWeightKg)) merged[exerciseId] = local;
          }
          for (const exerciseId of get().testRecordIds) {
            if (localRecords[exerciseId]) merged[exerciseId] = localRecords[exerciseId];
          }
          set({ records: merged });
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
