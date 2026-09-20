import { TEST_ID_PREFIX, isTestId } from "@/constants/test-data";
import { DEMO_BODY_LOG, DEMO_WORKOUTS, generateRecords } from "@/lib/demo-seed";
import { useBodyLogStore } from "@/store/body-log-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

/**
 * Developer Tools data helpers (see profile/developer-tools.tsx). Everything here writes straight
 * into the local stores with `setState` — never through `addWorkout` / `addEntry` / `checkAndRecord`,
 * which would push to the backend — so test data can never reach the database or other users.
 * Test workouts are also flagged `isBackfilled`, the flag every XP / streak / Crew War / crew
 * league / challenge calculation already skips, so they can't trigger anything server-bound either.
 * `restoreFromDatabase` is the way back to the real state.
 */
const DAY_MS = 86400000;

export const SEED_RANGES = [
  { label: "1 Week", days: 7 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "1 Year", days: 365 },
];

function byNewest<T>(getTime: (item: T) => number) {
  return (a: T, b: T) => getTime(b) - getTime(a);
}

/** Keeps the heavier record per lift. Lifts with an unconfirmed real PR push are skipped: those
 * records are still headed to the server, so they must not be replaced by (or mixed up with) fake ones. */
function mergeTestRecords(testRecords: Record<string, PersonalRecord>): void {
  const { records, pendingSyncIds, testRecordIds } = usePersonalRecordsStore.getState();
  const merged = { ...records };
  const changedIds: string[] = [];
  for (const [exerciseId, record] of Object.entries(testRecords)) {
    if (pendingSyncIds.includes(exerciseId)) continue;
    if (!merged[exerciseId] || record.bestWeightKg > merged[exerciseId].bestWeightKg) {
      merged[exerciseId] = record;
      changedIds.push(exerciseId);
    }
  }
  usePersonalRecordsStore.setState({ records: merged, testRecordIds: [...new Set([...testRecordIds, ...changedIds])] });
}

/** Adds the last `days` of the demo training year as local test workouts, and raises personal
 * records to match. Returns how many workouts were added (already-added ones are skipped). */
export function seedTestWorkouts(days: number): number {
  const since = Date.now() - days * DAY_MS;
  const existingIds = new Set(useWorkoutHistoryStore.getState().workouts.map((workout) => workout.id));
  const fresh = DEMO_WORKOUTS.filter((workout) => workout.completedAt >= since)
    .map((workout) => ({ ...workout, id: `${TEST_ID_PREFIX}${workout.id}`, isBackfilled: true }))
    .filter((workout) => !existingIds.has(workout.id));

  useWorkoutHistoryStore.setState((state) => ({
    workouts: [...fresh, ...state.workouts].sort(byNewest((workout) => workout.completedAt)),
  }));
  mergeTestRecords(generateRecords(fresh));
  return fresh.length;
}

/** Adds the last `days` of the demo weekly weigh-ins as local test entries. Returns how many were added. */
export function seedTestWeighIns(days: number): number {
  const since = Date.now() - days * DAY_MS;
  const existingIds = new Set(useBodyLogStore.getState().entries.map((entry) => entry.id));
  const fresh = DEMO_BODY_LOG.filter((entry) => entry.loggedAt >= since)
    .map((entry) => ({ ...entry, id: `${TEST_ID_PREFIX}${entry.id}` }))
    .filter((entry) => !existingIds.has(entry.id));

  useBodyLogStore.setState((state) => ({ entries: [...fresh, ...state.entries].sort(byNewest((entry) => entry.loggedAt)) }));
  return fresh.length;
}

/** Sets a lift's personal record locally. Returns false (and changes nothing) while the real record
 * for that lift is still waiting to be pushed — `retryPendingSync` would otherwise send the fake value. */
export function setTestPersonalRecord(exerciseId: string, exerciseName: string, weightKg: number, reps: number): boolean {
  if (usePersonalRecordsStore.getState().pendingSyncIds.includes(exerciseId)) return false;
  usePersonalRecordsStore.setState((state) => ({
    records: { ...state.records, [exerciseId]: { exerciseId, exerciseName, bestWeightKg: weightKg, bestReps: reps, achievedAt: Date.now() } },
    testRecordIds: [...new Set([...state.testRecordIds, exerciseId])],
  }));
  return true;
}

/** Adds a local weigh-in `daysAgo` days back. */
export function addTestWeighIn(weightKg: number, bodyFatPercent: number | null, daysAgo: number): void {
  const loggedAt = Date.now() - daysAgo * DAY_MS;
  useBodyLogStore.setState((state) => ({
    entries: [{ id: `${TEST_ID_PREFIX}body-${loggedAt}`, loggedAt, weightKg, bodyFatPercent }, ...state.entries].sort(byNewest((entry) => entry.loggedAt)),
  }));
}

/** Drops every local test workout / weigh-in / edited record, then pulls the database's version
 * again — so the app shows exactly what's stored on the server. Real data that hasn't reached the
 * server yet (workouts and records still pending a push) is kept. */
export async function restoreFromDatabase(): Promise<void> {
  useWorkoutHistoryStore.setState((state) => ({ workouts: state.workouts.filter((workout) => !isTestId(workout.id)) }));
  useBodyLogStore.setState((state) => ({ entries: state.entries.filter((entry) => !isTestId(entry.id)) }));
  usePersonalRecordsStore.setState((state) => ({
    records: Object.fromEntries(Object.entries(state.records).filter(([exerciseId]) => state.pendingSyncIds.includes(exerciseId))),
    testRecordIds: [],
  }));

  await Promise.all([
    useWorkoutHistoryStore.getState().syncFromServer(),
    usePersonalRecordsStore.getState().syncFromServer(),
    useBodyLogStore.getState().syncFromServer(),
  ]);
}
