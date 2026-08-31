import { navIcons, rankTierImages } from "@/constants/images";
import type { AppNotification } from "@/data/notifications";
import type { ApiCrewActivityEvent } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { calculateLiftRank, majorLiftForExerciseId } from "@/lib/rank";
import type { Gender } from "@/store/onboarding-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Also used by (tabs)/_layout.tsx when it merges in `buildCrewNotifications`'s results. */
export const NOTIFICATIONS_LIMIT = 8;
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
 * first) plus a streak nudge once it's actually worth celebrating. Crewmate moments (PR/streak/long
 * session/division up) are folded in separately by `buildCrewNotifications` below.
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

/**
 * A daily nudge to take your creatine — gated behind the "Creatine Reminder" toggle in Profile ->
 * Notifications (see onboarding-store.ts's `creatineReminders`; the header bell has no setting of
 * its own, it only ever reflects that toggle). The id is date-keyed rather than tracked in its own
 * dismissal store, so it naturally reappears as unread the next day once read via the existing
 * notifications-store `readIds` mechanism.
 */
export function buildCreatineReminderNotification(enabled: boolean, now: number = Date.now()): AppNotification[] {
  if (!enabled) return [];
  return [
    {
      id: `creatine-${toDateKey(new Date(now))}`,
      icon: navIcons.nutrition,
      title: "Don't forget your creatine today.",
      time: "Today",
      timestamp: now,
    },
  ];
}

function describeCrewEvent(event: ApiCrewActivityEvent): string {
  switch (event.eventType) {
    case "pr": {
      const { exerciseName, weightKg } = event.payload as { exerciseName: string; weightKg: number };
      return `${event.userName} hit a new PR — ${exerciseName} ${weightKg}kg.`;
    }
    case "streak": {
      const { days } = event.payload as { days: number };
      return `${event.userName} is on a ${days}-day streak.`;
    }
    case "long_session": {
      const { durationMinutes } = event.payload as { durationMinutes: number };
      return `${event.userName} just crushed a ${durationMinutes}-minute session.`;
    }
    case "division_up": {
      const { division } = event.payload as { division: string };
      return `${event.userName} reached ${division}.`;
    }
    default:
      return `${event.userName} made progress.`;
  }
}

/**
 * The crew-internal motivation feed (see store/crew-feed-store.ts), folded into the same bell
 * dropdown as personal notifications — tagged with the crew icon so it reads as "your crew", not
 * "you". Excludes events you triggered yourself (already covered by your own PR/streak notifications
 * above), so nobody sees their own achievement notified twice.
 */
export function buildCrewNotifications(
  events: ApiCrewActivityEvent[],
  myUserId: string | null | undefined,
  now: number = Date.now(),
): AppNotification[] {
  return events
    .filter((event) => event.userId !== myUserId)
    .map((event) => ({
      id: `crew-${event.id}`,
      icon: navIcons.crew,
      title: describeCrewEvent(event),
      time: formatRelative(event.createdAt, now),
      timestamp: event.createdAt,
    }));
}
