import { activeWeeklyChallenges } from "@/data/challenges";
import type { ChallengeMetric } from "@/data/challenges";
import { currentWeekKey, fromDateKey, toDateKey } from "@/lib/date";
import { toMuscleGroup } from "@/lib/muscle-groups";
import type { LoggedExercise } from "@/store/active-workout-store";
import { useAdminChallengeStore } from "@/store/admin-challenge-store";
import { useChallengeStore } from "@/store/challenge-store";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { PersonalRecord } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/** A crew member's real recent activity — see crew-activity-store.ts, backed by
 * backend/routes/crews.php's `/crews/:id/activity`. Every "crew-wide" function below takes a
 * lookup from member id to this shape instead of generating mock history, so a real crewmate's
 * real workouts drive challenge progress, stats, and league power — never a fabricated stand-in. */
export type MemberActivity = { recentWorkouts: CompletedWorkout[]; records: Record<string, PersonalRecord> };

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

/** A real member's contribution to a metric within a date range, from their actual logged workouts
 * (same `challengeContribution` used for the current user's own live progress, applied after the
 * fact to their real history — anti-cheat capping uses their current personal records as the
 * reference ceiling, since a full historical PR-at-the-time log doesn't exist). */
function realContributionInRange(
  workouts: CompletedWorkout[],
  records: Record<string, PersonalRecord>,
  metric: ChallengeMetric,
  startKey: string,
  endKey: string,
): number {
  let total = 0;
  for (const workout of workouts) {
    if (workout.isBackfilled) continue;
    const dateKey = toDateKey(new Date(workout.completedAt));
    if (dateKey < startKey || dateKey > endKey) continue;
    total += challengeContribution(metric, workout.exercises, records);
  }
  return Math.round(total);
}

/** The crew's combined progress toward a challenge: the current user's real (persisted) contribution, plus every other member's real contribution within the same date range. */
export function crewChallengeProgress(
  metric: ChallengeMetric,
  members: CrewMember[],
  myContribution: number,
  startKey: string,
  endKey: string,
  memberActivity: (memberId: string) => MemberActivity,
): number {
  let total = myContribution;
  for (const member of members) {
    if (member.id === CURRENT_MEMBER_ID) continue;
    const { recentWorkouts, records } = memberActivity(member.id);
    total += realContributionInRange(recentWorkouts, records, metric, startKey, endKey);
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
  memberActivity: (memberId: string) => MemberActivity,
): MemberContribution[] {
  return members
    .map((member) => {
      if (member.id === CURRENT_MEMBER_ID) return { member, amount: myContribution };
      const { recentWorkouts, records } = memberActivity(member.id);
      return { member, amount: realContributionInRange(recentWorkouts, records, metric, startKey, endKey) };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * A day-by-day cumulative progress trend for the challenge detail chart, from every real member's
 * actual workout dates. The current user's own total isn't tracked per-day (only a running sum), so
 * it's spread evenly across elapsed days as an approximation — everyone else's real per-workout
 * dates drive the trend's actual shape.
 */
export function challengeProgressTrend(
  metric: ChallengeMetric,
  members: CrewMember[],
  myContribution: number,
  startKey: string,
  endKey: string,
  memberActivity: (memberId: string) => MemberActivity,
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
      const { recentWorkouts, records } = memberActivity(member.id);
      dayTotal += realContributionInRange(recentWorkouts, records, metric, dateKey, dateKey);
    }
    cumulative += dayTotal;
    points.push({ date: dateKey, value: Math.round(cumulative) });
  }
  return points;
}

export type ChallengeFeedEntry = { id: string; memberName: string; avatarUrl: string; amount: number; unit: string; timestamp: number };

/** A real activity feed for the challenge detail screen, built from each member's most recent
 * genuine contributing workout within the range — real timestamps, not simulated ones. */
export function challengeFeed(
  metric: ChallengeMetric,
  unit: string,
  members: CrewMember[],
  startKey: string,
  endKey: string,
  memberActivity: (memberId: string) => MemberActivity,
): ChallengeFeedEntry[] {
  const entries: ChallengeFeedEntry[] = [];

  for (const member of members) {
    if (member.id === CURRENT_MEMBER_ID) continue;
    const { recentWorkouts, records } = memberActivity(member.id);
    const inRange = recentWorkouts
      .filter((workout) => {
        if (workout.isBackfilled) return false;
        const dateKey = toDateKey(new Date(workout.completedAt));
        return dateKey >= startKey && dateKey <= endKey;
      })
      .sort((a, b) => b.completedAt - a.completedAt);

    const latest = inRange.find((workout) => challengeContribution(metric, workout.exercises, records) > 0);
    if (!latest) continue;

    const amount = Math.round(challengeContribution(metric, latest.exercises, records));
    entries.push({ id: `${member.id}-${latest.id}`, memberName: member.name, avatarUrl: member.avatarUrl, amount, unit, timestamp: latest.completedAt });
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

  // App-wide admin-curated challenges (see admin-challenge-store.ts) — same progress mechanism as
  // the weekly/custom ones above, just sourced from the admin's hand-picked list instead.
  for (const challenge of useAdminChallengeStore.getState().challenges) {
    if (!challenge.isActive) continue;
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
