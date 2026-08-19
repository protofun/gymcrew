import { activeWeeklyChallenges } from "@/data/challenges";
import type { ChallengeMetric } from "@/data/challenges";
import type { MuscleGroup, WorkoutSession } from "@/data/workout-log";
import { currentWeekKey, fromDateKey, toDateKey } from "@/lib/date";
import { toMuscleGroup } from "@/lib/muscle-groups";
import type { LoggedExercise } from "@/store/active-workout-store";
import { useChallengeStore } from "@/store/challenge-store";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { PersonalRecord } from "@/store/personal-records-store";

// Anti-cheat, without requiring proof photos (too slow, and no one would actually do it): every
// logged set is capped against (a) an absolute plausible ceiling and (b) the lifter's own personal
// record for that exercise, before it's allowed to count toward a challenge. A genuine new PR still
// counts in full — it's only fabricated numbers (e.g. "10 × 1000kg bench") that get clamped down,
// and only a handful of sets per exercise count at all, so set-spamming doesn't help either.
const MAX_PLAUSIBLE_SET_WEIGHT_KG = 400;
const MAX_COUNTED_REPS_PER_SET = 30;
const MAX_COUNTED_SETS_PER_EXERCISE = 10;
const PR_MULTIPLIER_CAP = 1.5;

function sanitizedSetWeight(weightKg: number, previousBestKg: number | null): number {
  let capped = Math.min(weightKg, MAX_PLAUSIBLE_SET_WEIGHT_KG);
  if (previousBestKg && previousBestKg > 0) capped = Math.min(capped, previousBestKg * PR_MULTIPLIER_CAP);
  return Math.max(0, capped);
}

function sanitizedReps(reps: number): number {
  return Math.max(0, Math.min(reps, MAX_COUNTED_REPS_PER_SET));
}

function countedSets(exercise: LoggedExercise) {
  return exercise.sets.filter((set) => set.completed && !set.isWarmup).slice(0, MAX_COUNTED_SETS_PER_EXERCISE);
}

function sanitizedExerciseVolume(exercise: LoggedExercise, records: Record<string, PersonalRecord>): number {
  const previousBestKg = records[exercise.exerciseId]?.bestWeightKg ?? null;
  return countedSets(exercise).reduce((sum, set) => {
    const weight = sanitizedSetWeight(set.weightKg ?? 0, previousBestKg);
    const reps = sanitizedReps(set.reps ?? 0);
    return sum + weight * reps;
  }, 0);
}

function sanitizedExerciseReps(exercise: LoggedExercise): number {
  return countedSets(exercise).reduce((sum, set) => sum + sanitizedReps(set.reps ?? 0), 0);
}

/** How much a just-finished workout contributes to a given challenge metric, after anti-cheat sanitization. */
export function challengeContribution(
  metric: ChallengeMetric,
  exercises: LoggedExercise[],
  records: Record<string, PersonalRecord>,
): number {
  switch (metric.type) {
    case "totalVolume":
      return Math.round(exercises.reduce((sum, exercise) => sum + sanitizedExerciseVolume(exercise, records), 0));
    case "muscleVolume":
      return Math.round(
        exercises
          .filter((exercise) => toMuscleGroup(exercise.primaryMuscle) === metric.muscleGroup)
          .reduce((sum, exercise) => sum + sanitizedExerciseVolume(exercise, records), 0),
      );
    case "exerciseVolume":
      return Math.round(
        exercises
          .filter((exercise) => exercise.exerciseId === metric.exerciseId)
          .reduce((sum, exercise) => sum + sanitizedExerciseVolume(exercise, records), 0),
      );
    case "exerciseReps":
      return exercises
        .filter((exercise) => exercise.exerciseId === metric.exerciseId)
        .reduce((sum, exercise) => sum + sanitizedExerciseReps(exercise), 0);
    case "totalSets":
      return exercises.reduce((sum, exercise) => sum + countedSets(exercise).length, 0);
    case "totalWorkouts":
      return exercises.some((exercise) => countedSets(exercise).length > 0) ? 1 : 0;
    default:
      return 0;
  }
}

function mockMuscleVolumeShare(session: WorkoutSession, muscleGroup: MuscleGroup): number {
  const intensity = session.muscleIntensity[muscleGroup];
  if (!intensity) return 0;
  const totalIntensity = Object.values(session.muscleIntensity).reduce((sum: number, value) => sum + (value ?? 0), 0);
  if (totalIntensity === 0) return 0;
  return session.volumeKg * (intensity / totalIntensity);
}

/**
 * A crew member's mock sessions only log one "primary exercise" per day, so exercise-specific
 * challenges only pick up mock contribution on days that primary exercise happens to match — the
 * same approximation tradeoff as the rest of the mock history (see data/workout-log.ts).
 */
function mockContributionForDay(session: WorkoutSession, metric: ChallengeMetric): number {
  switch (metric.type) {
    case "totalVolume":
      return session.volumeKg;
    case "totalWorkouts":
      return 1;
    case "totalSets":
      return session.exercises * 4; // ~4 sets/exercise, matching this app's typical templates
    case "muscleVolume":
      return mockMuscleVolumeShare(session, metric.muscleGroup);
    case "exerciseVolume":
      return session.primaryExercise.name === metric.exerciseName
        ? session.primaryExercise.oneRepMaxKg * session.primaryExercise.reps
        : 0;
    case "exerciseReps":
      return session.primaryExercise.name === metric.exerciseName ? session.primaryExercise.reps : 0;
    default:
      return 0;
  }
}

/** A crew member's mock contribution to a metric within a date range. */
export function mockContributionInRange(
  sessions: Record<string, WorkoutSession>,
  metric: ChallengeMetric,
  startKey: string,
  endKey: string,
): number {
  let total = 0;
  for (const [dateKey, session] of Object.entries(sessions)) {
    if (dateKey < startKey || dateKey > endKey) continue;
    total += mockContributionForDay(session, metric);
  }
  return Math.round(total);
}

/** The crew's combined progress toward a challenge: the current user's real (persisted) contribution, plus every other member's mock contribution within the same date range. */
export function crewChallengeProgress(
  metric: ChallengeMetric,
  members: CrewMember[],
  myContribution: number,
  startKey: string,
  endKey: string,
  memberSessions: (memberId: string) => Record<string, WorkoutSession>,
): number {
  let total = myContribution;
  for (const member of members) {
    if (member.id === CURRENT_MEMBER_ID) continue;
    total += mockContributionInRange(memberSessions(member.id), metric, startKey, endKey);
  }
  return total;
}

export type MemberContribution = { member: CrewMember; amount: number };

/** Each member's individual contribution (not summed) — for a challenge's "Top Contributors" list. */
export function perMemberContributions(
  metric: ChallengeMetric,
  members: CrewMember[],
  myContribution: number,
  startKey: string,
  endKey: string,
  memberSessions: (memberId: string) => Record<string, WorkoutSession>,
): MemberContribution[] {
  return members
    .map((member) => ({
      member,
      amount: member.id === CURRENT_MEMBER_ID ? myContribution : mockContributionInRange(memberSessions(member.id), metric, startKey, endKey),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * A day-by-day cumulative progress trend for the challenge detail chart. Other members' mock
 * history is genuinely per-day, so it drives the trend's shape; the current user's own total isn't
 * tracked per-day (only a running sum), so it's spread evenly across elapsed days as an approximation.
 */
export function challengeProgressTrend(
  metric: ChallengeMetric,
  members: CrewMember[],
  myContribution: number,
  startKey: string,
  endKey: string,
  memberSessions: (memberId: string) => Record<string, WorkoutSession>,
): { date: string; value: number }[] {
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey < toDateKey(new Date()) ? endKey : toDateKey(new Date()));
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const myPerDay = myContribution / dayCount;

  const points: { date: string; value: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateKey = toDateKey(day);
    let dayTotal = myPerDay;
    for (const member of members) {
      if (member.id === CURRENT_MEMBER_ID) continue;
      dayTotal += mockContributionInRange(memberSessions(member.id), metric, dateKey, dateKey);
    }
    cumulative += dayTotal;
    points.push({ date: dateKey, value: Math.round(cumulative) });
  }
  return points;
}

export type ChallengeFeedEntry = { id: string; memberName: string; avatarUrl: string; amount: number; unit: string; timestamp: number };

/** A believable activity feed for the challenge detail screen, built from each member's most recent mock contribution day. */
export function challengeFeed(
  metric: ChallengeMetric,
  unit: string,
  members: CrewMember[],
  startKey: string,
  endKey: string,
  memberSessions: (memberId: string) => Record<string, WorkoutSession>,
): ChallengeFeedEntry[] {
  const entries: ChallengeFeedEntry[] = [];

  for (const member of members) {
    if (member.id === CURRENT_MEMBER_ID) continue;
    const sessions = memberSessions(member.id);
    const dateKeys = Object.keys(sessions)
      .filter((key) => key >= startKey && key <= endKey)
      .sort()
      .reverse();
    const latestKey = dateKeys[0];
    if (!latestKey) continue;

    const amount = Math.round(mockContributionForDay(sessions[latestKey], metric));
    if (amount <= 0) continue;

    const daysAgo = Math.max(0, Math.round((fromDateKey(toDateKey(new Date())).getTime() - fromDateKey(latestKey).getTime()) / 86400000));
    const timestamp = Date.now() - daysAgo * 86400000 - ((member.id.charCodeAt(1) ?? 0) % 6) * 3600000;

    entries.push({ id: `${member.id}-${latestKey}`, memberName: member.name, avatarUrl: member.avatarUrl, amount, unit, timestamp });
  }

  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export function weekKeyRange(weekKey: string): { startKey: string; endKey: string } {
  const start = fromDateKey(weekKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { startKey: weekKey, endKey: toDateKey(end) };
}

/**
 * Call once when a workout finishes (solo, crew-led, or crew-joined all funnel through the same
 * screen) — adds this session's sanitized contribution to every currently active challenge.
 * `recordsBeforeThisWorkout` must be captured before `checkPersonalRecords` runs, otherwise a
 * fabricated set would just become its own new "personal record" and cap against itself.
 */
export function recordChallengeContributions(exercises: LoggedExercise[], recordsBeforeThisWorkout: Record<string, PersonalRecord>) {
  const { customChallenges, addProgress } = useChallengeStore.getState();
  const now = Date.now();

  for (const challenge of activeWeeklyChallenges(currentWeekKey())) {
    const amount = challengeContribution(challenge.metric, exercises, recordsBeforeThisWorkout);
    if (amount > 0) addProgress(challenge.instanceId, amount);
  }

  for (const challenge of customChallenges) {
    if (challenge.endsAt <= now) continue;
    const amount = challengeContribution(challenge.metric, exercises, recordsBeforeThisWorkout);
    if (amount > 0) addProgress(challenge.id, amount);
  }
}

/** A believable opponent pace for a custom crew-vs-crew challenge — no real opponent data exists, so this simulates steady progress toward their own target over the challenge window. */
export function simulatedOpponentProgress(challengeId: string, target: number, startedAt: number, endsAt: number): number {
  const now = Date.now();
  const fraction = Math.max(0, Math.min(1, (now - startedAt) / Math.max(1, endsAt - startedAt)));
  let hash = 0;
  for (let i = 0; i < challengeId.length; i++) hash = (hash * 31 + challengeId.charCodeAt(i)) >>> 0;
  const paceVariance = 0.65 + (hash % 40) / 100; // ~0.65–1.04x pace
  return Math.min(target, Math.round(target * fraction * paceVariance));
}
