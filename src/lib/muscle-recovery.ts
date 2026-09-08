import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * Recommended rest before training the same muscle group hard again, in hours — based on published
 * strength-training recovery guidelines. Muscle size, fiber-type mix, and how much the muscle is
 * already used in daily life all drive the spread: larger, fast-twitch-dominant, heavily-recruited
 * groups (back, quads, hamstrings, glutes) need roughly 48-96h; chest sits in the middle at ~48h;
 * smaller, slow-twitch-leaning, constantly-used-in-daily-life groups — calves, forearms (folded into
 * biceps in this app's 10-group model), and abs/core — recover fastest, ~24h, consistent with real
 * programs training them near-daily. Shoulders and triceps land in between (~36h). These are
 * reasonable, cited defaults, not a promise — actual recovery varies with intensity, volume, sleep,
 * and the individual. See:
 * https://www.thestrengthcrew.com/blog/whysomemusclegroupstakelongertorecover
 * https://shop.bodybuilding.com/blogs/recovery/the-science-of-muscle-recovery-how-long-should-you-rest-between-workouts
 * https://www.jefit.com/blog/optimal-recovery-time-for-strength-training
 */
export const MUSCLE_RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 48,
  shoulders: 36,
  back: 72,
  triceps: 36,
  biceps: 24,
  abs: 24,
  quads: 72,
  hamstrings: 72,
  calves: 24,
  glutes: 72,
};

/** Same load floor `templateMuscleIntensity` (workout-templates.ts) and the workout-split
 * generator already treat as "this muscle was actually trained hard," not just brushed by a
 * secondary movement. */
const MEANINGFUL_INTENSITY_THRESHOLD = 3;

export type MuscleRecoveryStatus = {
  group: MuscleGroup;
  recoveryHours: number;
  /** `null` when there's no qualifying session to recover from at all yet. */
  lastTrainedAt: number | null;
  readyAt: number | null;
  /** Hours until fully recovered, floored at 0 once the window has passed. `null` alongside
   * `lastTrainedAt: null`. */
  hoursRemaining: number | null;
  isRecovered: boolean;
};

function statusFor(group: MuscleGroup, lastTrainedAt: number | null, now: number): MuscleRecoveryStatus {
  const recoveryHours = MUSCLE_RECOVERY_HOURS[group];
  if (lastTrainedAt === null) {
    return { group, recoveryHours, lastTrainedAt: null, readyAt: null, hoursRemaining: null, isRecovered: true };
  }
  const readyAt = lastTrainedAt + recoveryHours * 3600000;
  const hoursRemaining = Math.max(0, (readyAt - now) / 3600000);
  return { group, recoveryHours, lastTrainedAt, readyAt, hoursRemaining, isRecovered: hoursRemaining <= 0 };
}

/** Recovery status for one specific completed workout's meaningfully-trained muscles — e.g. the
 * workout summary screen, right after finishing. */
export function recoveryStatusForWorkout(workout: CompletedWorkout, now: number = Date.now()): MuscleRecoveryStatus[] {
  return ALL_MUSCLE_GROUPS.filter((group) => (workout.muscleIntensity[group] ?? 0) >= MEANINGFUL_INTENSITY_THRESHOLD).map((group) =>
    statusFor(group, workout.completedAt, now),
  );
}

/** Recovery status across the user's whole history, one entry per muscle group — e.g. the Body
 * Graph's recovery overlay. `workouts` newest-first (matches useWorkoutHistoryStore's own order). */
export function recoveryStatusForAllGroups(workouts: CompletedWorkout[], now: number = Date.now()): Record<MuscleGroup, MuscleRecoveryStatus> {
  const result = {} as Record<MuscleGroup, MuscleRecoveryStatus>;
  for (const group of ALL_MUSCLE_GROUPS) {
    const lastWorkout = workouts.find((workout) => (workout.muscleIntensity[group] ?? 0) >= MEANINGFUL_INTENSITY_THRESHOLD);
    result[group] = statusFor(group, lastWorkout?.completedAt ?? null, now);
  }
  return result;
}

/** "18h left" / "2d left" / "Ready now" / "No data" — compact label for a badge or legend chip. */
export function formatRecoveryLabel(status: MuscleRecoveryStatus): string {
  if (status.hoursRemaining === null) return "No data";
  if (status.isRecovered) return "Ready now";
  if (status.hoursRemaining < 24) return `${Math.ceil(status.hoursRemaining)}h left`;
  return `${Math.ceil(status.hoursRemaining / 24)}d left`;
}

/** "ready Thursday at 3:00 PM" — the fuller phrasing for a detail row, not just a badge. */
export function formatReadyAt(readyAt: number): string {
  const date = new Date(readyAt);
  const isToday = date.toDateString() === new Date().toDateString();
  const dayLabel = isToday ? "today" : date.toLocaleDateString("en-US", { weekday: "long" });
  return `Ready ${dayLabel} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
