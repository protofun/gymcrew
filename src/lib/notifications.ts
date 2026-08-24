import { navIcons, rankTierImages } from "@/constants/images";
import type { AppNotification } from "@/data/notifications";
import { calculateLiftRank, majorLiftForExerciseId } from "@/lib/rank";
import type { Gender } from "@/store/onboarding-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOTIFICATIONS_LIMIT = 8;
/** Below this, a streak isn't yet worth a nudge — every 1-day streak notifying would just be noise. */
const STREAK_NOTIFY_MIN_DAYS = 3;

function formatRelative(fromMs: number, toMs: number = Date.now()): string {
  const diff = Math.max(0, toMs - fromMs);
  if (diff < HOUR_MS) return "Just now";
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(diff / DAY_MS);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

type RankProfileInput = { weightKg?: number; gender?: Gender; age?: number };

/** The medal that PR actually earned, same calculation as the PR celebration screen — falls back to
 * the generic PR icon for lifts without an established strength standard (only the 4 major lifts have one). */
function iconForPr(exerciseId: string, weightKg: number, profile: RankProfileInput) {
  const majorLift = majorLiftForExerciseId(exerciseId);
  if (!majorLift || !profile.weightKg || !profile.gender) return navIcons.prs;
  const tier = calculateLiftRank(majorLift, weightKg, { bodyWeightKg: profile.weightKg, gender: profile.gender, age: profile.age });
  return rankTierImages[tier];
}

/**
 * Real notifications derived from actual app state — every logged PR (from workout history, newest
 * first) plus a streak nudge once it's actually worth celebrating. No fabricated crew/social events,
 * since there's no real timestamped activity feed to draw those from yet.
 */
export function buildNotifications(
  workouts: CompletedWorkout[],
  streakDays: number,
  profile: RankProfileInput,
  now: number = Date.now(),
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const workout of workouts) {
    for (const pr of workout.prs) {
      notifications.push({
        id: `pr-${workout.id}-${pr.exerciseId}`,
        icon: iconForPr(pr.exerciseId, pr.weightKg, profile),
        title: `New PR! Your ${pr.exerciseName} went up to ${pr.weightKg}${workout.unit}.`,
        time: formatRelative(workout.completedAt, now),
        timestamp: workout.completedAt,
        workoutId: workout.id,
      });
    }
  }

  if (streakDays >= STREAK_NOTIFY_MIN_DAYS) {
    notifications.push({
      id: `streak-${streakDays}`,
      icon: navIcons.streak,
      title: `You're on a ${streakDays}-day streak. Keep it going!`,
      time: "Today",
      timestamp: now,
    });
  }

  return notifications.sort((a, b) => b.timestamp - a.timestamp).slice(0, NOTIFICATIONS_LIMIT);
}
