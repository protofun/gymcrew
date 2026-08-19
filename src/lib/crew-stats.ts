import { BARBELL_EXERCISES, BODYWEIGHT_EXERCISES } from "@/data/challenges";
import { generateMemberWorkoutSessions, type MuscleGroup, type WorkoutSession } from "@/data/workout-log";
import { mockContributionInRange } from "@/lib/challenge-progress";
import { fromDateKey, getCurrentWeekDates, toDateKey } from "@/lib/date";
import { crewMuscleBalance } from "@/lib/crew-muscle-balance";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

export type MuscleSplitSegment = { label: string; value: number; color: string };

// A distinct color per slice — the muscle heatmap already owns a single-hue intensity scale, so
// this is its own small palette rather than reusing that.
const MUSCLE_SPLIT_PALETTE = ["#E3FF00", "#FF6D00", "#7C4DFF", "#00E5FF", "#FF3B30", "#00C853"];

export type StatsRange = "week" | "month" | "allTime";

/** Every exercise the crew Stats tab can chart — same curated list the weekly challenges draw from. */
export const TRACKABLE_EXERCISES: { exerciseId: string; exerciseName: string }[] = [
  ...BARBELL_EXERCISES.map(({ exerciseId, exerciseName }) => ({ exerciseId, exerciseName })),
  ...BODYWEIGHT_EXERCISES.map(({ exerciseId, exerciseName }) => ({ exerciseId, exerciseName })),
];

export function rangeDateKeys(range: StatsRange): { startKey: string; endKey: string } {
  const today = new Date();
  const endKey = toDateKey(today);

  if (range === "week") {
    return { startKey: toDateKey(getCurrentWeekDates(today)[0]), endKey };
  }
  if (range === "month") {
    return { startKey: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)), endKey };
  }
  // "All time" mock history only goes back ~3 months (see generateMemberWorkoutSessions), so that's the useful window.
  return { startKey: toDateKey(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), endKey };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** A believable crew-power trend leading up to today's real value — there's no historical crew-power log, so this is simulated but anchored to the real current number. */
export function crewPowerTrend(range: StatsRange, crewPower: number): { date: string; value: number }[] {
  const { startKey, endKey } = rangeDateKeys(range);
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const pointCount = range === "week" ? 7 : range === "month" ? 8 : 10;
  const step = Math.max(1, Math.round(totalDays / (pointCount - 1)));

  const points: { date: string; value: number }[] = [];
  for (let i = 0; i < pointCount; i++) {
    const dayOffset = Math.min(totalDays, i * step);
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + dayOffset);
    const hash = hashString(`power-${range}-${i}`);
    const noise = ((hash % 21) - 10) / 100; // -10%..+10%
    const growth = (i + 1) / pointCount;
    const base = crewPower * (0.7 + growth * 0.3);
    points.push({ date: toDateKey(date), value: Math.round(base * (1 + noise)) });
  }
  points[points.length - 1] = { date: endKey, value: crewPower };
  return points;
}

function realExerciseVolumeInRange(workouts: CompletedWorkout[], exerciseId: string, startKey: string, endKey: string): number {
  let total = 0;
  for (const workout of workouts) {
    const dateKey = toDateKey(new Date(workout.completedAt));
    if (dateKey < startKey || dateKey > endKey) continue;
    for (const exercise of workout.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (set.completed && !set.isWarmup) total += (set.weightKg ?? 0) * (set.reps ?? 0);
      }
    }
  }
  return total;
}

/** The current user's total logged volume (every exercise) within a date range. */
export function realTotalVolumeInRange(workouts: CompletedWorkout[], startKey: string, endKey: string): number {
  let total = 0;
  for (const workout of workouts) {
    const dateKey = toDateKey(new Date(workout.completedAt));
    if (dateKey < startKey || dateKey > endKey) continue;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (set.completed && !set.isWarmup) total += (set.weightKg ?? 0) * (set.reps ?? 0);
      }
    }
  }
  return Math.round(total);
}

/** Number of completed workouts the current user logged within a date range. */
export function realTotalWorkoutsInRange(workouts: CompletedWorkout[], startKey: string, endKey: string): number {
  return workouts.filter((workout) => {
    const dateKey = toDateKey(new Date(workout.completedAt));
    return dateKey >= startKey && dateKey <= endKey;
  }).length;
}

/** Total completed (non-warmup) sets the current user logged within a date range. */
export function realTotalSetsInRange(workouts: CompletedWorkout[], startKey: string, endKey: string): number {
  let total = 0;
  for (const workout of workouts) {
    const dateKey = toDateKey(new Date(workout.completedAt));
    if (dateKey < startKey || dateKey > endKey) continue;
    for (const exercise of workout.exercises) {
      total += exercise.sets.filter((set) => set.completed && !set.isWarmup).length;
    }
  }
  return total;
}

function otherMemberSessions(members: CrewMember[]): Record<string, WorkoutSession>[] {
  return members.filter((member) => member.id !== CURRENT_MEMBER_ID).map((member) => generateMemberWorkoutSessions(member.id));
}

export type CrewTotals = { volumeKg: number; workouts: number; sets: number };

/** Crew-wide totals (real data for the current user, mock for everyone else) for the snapshot row atop the Stats tab. */
export function crewTotals(members: CrewMember[], myWorkouts: CompletedWorkout[], startKey: string, endKey: string): CrewTotals {
  let volumeKg = realTotalVolumeInRange(myWorkouts, startKey, endKey);
  let workouts = realTotalWorkoutsInRange(myWorkouts, startKey, endKey);
  let sets = realTotalSetsInRange(myWorkouts, startKey, endKey);

  for (const sessions of otherMemberSessions(members)) {
    volumeKg += mockContributionInRange(sessions, { type: "totalVolume" }, startKey, endKey);
    workouts += mockContributionInRange(sessions, { type: "totalWorkouts" }, startKey, endKey);
    sets += mockContributionInRange(sessions, { type: "totalSets" }, startKey, endKey);
  }

  return { volumeKg: Math.round(volumeKg), workouts, sets };
}

/** This week's crew-wide training load per muscle group as donut-chart segments — the top 5 groups get their own slice, the rest are folded into "Other" so the chart stays legible. */
export function crewMuscleSplit(members: CrewMember[], myWorkouts: CompletedWorkout[]): MuscleSplitSegment[] {
  const intensity = crewMuscleBalance(members, myWorkouts);
  const sorted = (Object.entries(intensity) as [MuscleGroup, number | undefined][])
    .filter((entry): entry is [MuscleGroup, number] => (entry[1] ?? 0) > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0);

  const segments: MuscleSplitSegment[] = top.map(([group, value], index) => ({
    label: formatMuscleLabel(group),
    value,
    color: MUSCLE_SPLIT_PALETTE[index],
  }));
  if (rest > 0) segments.push({ label: "Other", value: rest, color: colors.neutral.divider });

  return segments;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Crew-wide workout count per weekday, this week (real data for the current user, mock for everyone else) — for the Stats tab's weekly-activity bar chart. */
export function crewWeeklyActivity(members: CrewMember[], myWorkouts: CompletedWorkout[]): { label: string; value: number }[] {
  const sessionsList = otherMemberSessions(members);

  return getCurrentWeekDates(new Date()).map((date, index) => {
    const dateKey = toDateKey(date);
    let count = realTotalWorkoutsInRange(myWorkouts, dateKey, dateKey);
    for (const sessions of sessionsList) {
      count += mockContributionInRange(sessions, { type: "totalWorkouts" }, dateKey, dateKey);
    }
    return { label: WEEKDAY_LABELS[index], value: count };
  });
}

/** Crew-wide total volume for one named exercise (real data for the current user, mock for everyone else). */
export function crewExerciseVolume(
  exerciseId: string,
  exerciseName: string,
  members: CrewMember[],
  myWorkouts: CompletedWorkout[],
  startKey: string,
  endKey: string,
): number {
  let total = realExerciseVolumeInRange(myWorkouts, exerciseId, startKey, endKey);
  for (const sessions of otherMemberSessions(members)) {
    total += mockContributionInRange(sessions, { type: "exerciseVolume", exerciseId, exerciseName }, startKey, endKey);
  }
  return Math.round(total);
}

/** Cumulative crew-wide volume for one exercise, day by day, for the chart in the Stats tab's exercise explorer. */
export function crewExerciseVolumeTrend(
  exerciseId: string,
  exerciseName: string,
  members: CrewMember[],
  myWorkouts: CompletedWorkout[],
  startKey: string,
  endKey: string,
): { date: string; value: number }[] {
  const sessionsList = otherMemberSessions(members);
  const start = fromDateKey(startKey);
  const dayCount = Math.max(1, Math.round((fromDateKey(endKey).getTime() - start.getTime()) / 86400000) + 1);

  const points: { date: string; value: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateKey = toDateKey(day);
    let dayTotal = realExerciseVolumeInRange(myWorkouts, exerciseId, dateKey, dateKey);
    for (const sessions of sessionsList) {
      dayTotal += mockContributionInRange(sessions, { type: "exerciseVolume", exerciseId, exerciseName }, dateKey, dateKey);
    }
    cumulative += dayTotal;
    points.push({ date: dateKey, value: Math.round(cumulative) });
  }
  return points;
}
