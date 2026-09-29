import { TEST_ID_PREFIX, isTestId } from "@/constants/test-data";
import { DEMO_BODY_LOG, DEMO_WORKOUTS, SPLIT, buildExercise, generateRecords, hashString, heaviestSet } from "@/lib/demo-seed";
import { computeCompletedSets, computeMuscleIntensity, computeVolumeKg } from "@/lib/workout-metrics";
import type { WorkoutPr } from "@/lib/workout-finish";
import { useBodyLogStore } from "@/store/body-log-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";

/**
 * Developer Tools data helpers (see profile/developer-tools.tsx). Everything here writes straight
 * into the local stores with `setState` — never through `addWorkout` / `addEntry` / `checkAndRecord`,
 * which would push to the backend — so test data can never reach the database or other users.
 * Test workouts are also flagged `isBackfilled`, the flag every XP / streak / Crew War / crew
 * league / challenge calculation already skips, so they can't trigger anything server-bound either.
 * `restoreFromDatabase` is the way back to the real state.
 */
const DAY_MS = 86400000;

/**
 * A proper integer mixer (triple32-style: xor-shift + multiply, twice) for the random phase's daily
 * coin flip — `demo-seed.ts`'s `hashString`, fed a string that only ever changes in its last digit
 * (`consistency-roll-700`, `consistency-roll-701`, ...), turned out to return CONSECUTIVE integers for
 * consecutive `daysAgo` (its polynomial rolling hash is a near-identity function for strings sharing a
 * prefix with an incrementing final character) — `% 7` on a near-identity sequence lines up with the
 * calendar's own 7-day cycle, so "random" days landed on the same one or two weekdays every week
 * instead of scattering. Confirmed with a histogram (trained days by weekday) before and after this
 * swap — `hashString` gave `[43, 43, 0, 0, 7, 7, 0]` for a 2/week target; this gives a roughly even
 * `[13, 16, 15, 12, 13, 12, 14]`. Operates on the plain `daysAgo` number, not a string, so there's no
 * shared-prefix pattern to begin with. */
function mixInt(seed: number): number {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

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

export type ConsistencySeedOptions = {
  /** How many years of history to generate, counting back from today. */
  yearsBack: number;
  /** Weekdays trained during the structured phase — 0 = Monday .. 6 = Sunday. */
  weekdays: number[];
  /** Days ago the structured phase takes over from the random one. 0 keeps the whole range random;
   * `yearsBack * 365` (or more) keeps the whole range structured. */
  structuredFromDaysAgo: number;
  /** Average sessions per week during the random phase (a plausible, inconsistent stretch — no fixed
   * days, unlike the structured phase's `weekdays`). */
  randomSessionsPerWeek: number;
};

/** A configurable alternative to `seedTestWorkouts`, purpose-built for the Training Consistency
 * heatmap (see profile/training-consistency.tsx) — a real dev account rarely has the years of
 * history that page is actually meant to show. Oldest to newest, two phases: a random one first (an
 * inconsistent "getting into it" stretch, ~`randomSessionsPerWeek` sessions/week on no fixed days)
 * then, from `structuredFromDaysAgo` days ago on, a structured one (a fixed weekly pattern —
 * `weekdays`) — the same "random early, consistent once it stuck" shape real training history
 * actually has, rather than a uniform scatter across every year. Reuses `demo-seed.ts`'s real PPL
 * rotation and progressive-overload math (`SPLIT`/`buildExercise`), so these workouts look and behave
 * exactly like the single fixed demo year's, just spread across a configurable range. Returns how
 * many workouts were added. */
export function seedConsistencyHistory(options: ConsistencySeedOptions): number {
  const now = Date.now();
  const totalDays = Math.max(1, options.yearsBack * 365);
  const existingIds = new Set(useWorkoutHistoryStore.getState().workouts.map((workout) => workout.id));
  const bestByExercise = new Map<string, { weightKg: number; reps: number }>();
  const fresh: CompletedWorkout[] = [];
  let splitIndex = 0;

  // Oldest to newest, so progressive overload (and PR detection) only ever climbs — same order
  // demo-seed.ts's own single-year generator uses, for the same reason.
  for (let daysAgo = totalDays; daysAgo >= 1; daysAgo--) {
    const date = new Date(now - daysAgo * DAY_MS);
    const weekday = (date.getDay() + 6) % 7; // 0 Mon .. 6 Sun, matches `weekdays`

    const structured = daysAgo <= options.structuredFromDaysAgo;
    const trains = structured
      ? options.weekdays.includes(weekday)
      : (mixInt(daysAgo) % 1000) / 1000 < options.randomSessionsPerWeek / 7;
    if (!trains) continue;

    const id = `${TEST_ID_PREFIX}consistency-${daysAgo}`;
    if (existingIds.has(id)) continue;

    const progress = (totalDays - daysAgo) / totalDays;
    const day = SPLIT[splitIndex % SPLIT.length];
    splitIndex++;
    const exercises = day.plan.map((plan) => buildExercise(plan, progress, `${plan.exerciseId}-consistency-${daysAgo}`));

    const prs: WorkoutPr[] = [];
    for (const exercise of exercises) {
      const heaviest = heaviestSet(exercise);
      if (!heaviest) continue;
      const previous = bestByExercise.get(exercise.exerciseId);
      if (!previous || heaviest.weightKg > previous.weightKg) {
        prs.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.name,
          weightKg: heaviest.weightKg,
          reps: heaviest.reps,
          previousBestKg: previous?.weightKg ?? null,
          previousAchievedAt: null,
        });
        bestByExercise.set(exercise.exerciseId, heaviest);
      }
    }

    const eveningOffsetMinutes = hashString(`consistency-time-${daysAgo}`) % 120; // trains sometime 5:00-7:00pm
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const completedAt = dayStart + 17 * 3600000 + eveningOffsetMinutes * 60000;
    const durationSeconds = 2700 + (hashString(`consistency-dur-${daysAgo}`) % 1500); // 45-70 min

    fresh.push({
      id,
      name: day.name,
      completedAt,
      durationSeconds,
      unit: "kg",
      notes: "",
      exercises,
      muscleIntensity: computeMuscleIntensity(exercises),
      volumeKg: Math.round(computeVolumeKg(exercises)),
      completedSets: computeCompletedSets(exercises),
      prs,
      isBackfilled: true,
    });
  }

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
