import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api, isApiConfigured } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { mostNeglectedCrewMuscleGroup } from "@/lib/crew-muscle-balance";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { STREAK_NOTIFY_MIN_DAYS } from "@/lib/notifications";
import { computeCurrentStreak } from "@/lib/streak";
import { computeStrongestMonthlyGain } from "@/lib/strength-trend";
import { showToast } from "@/lib/toast";
import { formatWeight } from "@/lib/units";
import { computeWeeklyRecap } from "@/lib/weekly-recap";
import { useCrewActivityStore } from "@/store/crew-activity-store";
import { useCrewStore } from "@/store/crew-store";
import { useCurrencyStore } from "@/store/currency-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";

// Foreground notifications are silent by default in expo-notifications — without this, a push that
// arrives while the app is open never shows anything at all. The banner itself is suppressed
// (`shouldShowBanner: false`) in favor of the app's own on-brand toast (see
// `addForegroundNotificationToastListener` below) so a foreground push doesn't show twice —
// `shouldShowList: true` still records it in the OS notification history either way.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Maps a push's `data.type` (set server-side — see backend/routes/crew-activity-events.php and
 * admin-ops.php) to the matching toast look. Falls back to the neutral "info" style for anything
 * else (a payload with no `type`, or a future category this hasn't been taught about yet). */
function toastVariantFor(type: unknown): "achievement" | "info" {
  return type === "crew_activity" ? "achievement" : "info";
}

/**
 * Shows the app's own toast (see `components/AppToast.tsx`) for a push notification received
 * while the app is in the foreground, styled per the notification's `data.type`. Call
 * `addForegroundNotificationToastListener` to wire this up automatically — this is exported
 * separately mainly so it's easy to unit-test the title/body/variant mapping in isolation.
 */
export function showForegroundNotificationToast(notification: Notifications.Notification): void {
  const { title, body, data } = notification.request.content;
  if (!title && !body) return;
  showToast(toastVariantFor(data?.type), title ?? "", body ?? undefined);
}

/**
 * Subscribes to pushes that arrive while the app is open and surfaces each one as a toast.
 * Returns the subscription so the caller can `.remove()` it on unmount — see `(tabs)/_layout.tsx`
 * for the one place this is wired up (the whole signed-in app shell's lifetime).
 */
export function addForegroundNotificationToastListener(): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(showForegroundNotificationToast);
}

/**
 * Requests OS notification permission (a no-op if already granted or denied — this never re-prompts
 * once the user has answered once) and, if granted, registers this device's Expo push token with the
 * backend so server-triggered pushes (crew PRs, division-ups — see backend/routes/crew-activity-events.php)
 * can actually reach it. Safe to call anywhere, anytime: no-ops on web (Expo push tokens aren't a web
 * concept) and whenever the backend or an EAS project isn't configured yet (see eas.json's
 * projectId, set by `eas init` — this can't get a real push token without it).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (isApiConfigured) await api.registerPushToken(token);
  } catch (error) {
    // Most commonly: no EAS projectId configured yet (see eas.json's doc comment above) — not
    // fatal, local reminders below still work fine without a push token.
    console.warn("Failed to register push token", error);
  }
}

/** Stable per-reminder-kind id so re-scheduling (e.g. the user changes the time) replaces the
 * previous one instead of stacking duplicates. */
export type ReminderKind = "workout" | "creatine";

export const REMINDER_DEFAULTS: Record<ReminderKind, { defaultTime: string; title: string; body: string }> = {
  workout: { defaultTime: "18:00", title: "Time to train", body: "Keep your streak going — log a workout today." },
  creatine: { defaultTime: "09:00", title: "Creatine reminder", body: "Don't forget your daily dose." },
};

function reminderIdentifier(kind: ReminderKind): string {
  return `gymcrew-reminder-${kind}`;
}

/**
 * Schedules (or replaces) a daily local reminder at "HH:mm" — no server or push token needed, this
 * is purely on-device. Used for Workout Reminders and the Creatine Reminder (see
 * profile/notifications.tsx) — both are personal, time-of-day nudges, not something that depends on
 * anyone else's data, so there's no reason to round-trip them through a server at all.
 */
export async function scheduleDailyReminder(kind: ReminderKind, time: string, title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;

  const identifier = reminderIdentifier(kind);
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const [hour, minute] = time.split(":").map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hour || 0, minute: minute || 0 },
  });
}

export async function cancelDailyReminder(kind: ReminderKind): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier(kind)).catch(() => {});
}

const STREAK_LOSS_ID = "gymcrew-reminder-streak-loss";
const WEEKLY_RECAP_ID = "gymcrew-reminder-weekly-recap";
const STRONGER_PROGRESS_ID = "gymcrew-reminder-stronger-progress";
/** Local hour the streak-loss nudge fires at, if it fires at all today — see `scheduleStreakLossReminder`. */
const STREAK_LOSS_HOUR = 20;

/**
 * One-off "you're about to lose your streak" nudge for 20:00 today — only when there's a streak
 * worth protecting (same `STREAK_NOTIFY_MIN_DAYS` threshold as the in-app streak nudge — see
 * lib/notifications.ts), today hasn't been trained yet, and it's still early enough for the nudge to
 * be useful. Re-evaluated every time `reconcileNotificationSchedules` runs — on app mount and right
 * after a workout finishes (see workout/active.tsx) — so logging a workout cancels this immediately
 * instead of it firing later the same evening.
 */
async function scheduleStreakLossReminder(streak: number, trainedToday: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(STREAK_LOSS_ID).catch(() => {});

  if (streak < STREAK_NOTIFY_MIN_DAYS || trainedToday) return;

  const now = new Date();
  if (now.getHours() >= STREAK_LOSS_HOUR) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const triggerDate = new Date(now);
  triggerDate.setHours(STREAK_LOSS_HOUR, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_LOSS_ID,
    content: { title: "Don't lose your streak", body: `🔥 ${streak}-day streak on the line — log a workout before midnight.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

/**
 * Weekly progress summary, every Monday 9am — content (workouts/PRs/streak from the trailing 7
 * days) is computed fresh each time this reschedules, so it reflects whatever's most recently known
 * locally. Softer win-back copy for a zero-workout week instead of a hollow "0 workouts" stat.
 */
async function scheduleWeeklyRecapReminder(workoutCount: number, prCount: number, streak: number): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const body =
    workoutCount === 0
      ? "You didn't train this week — your crew's still going. Jump back in?"
      : `This week: ${workoutCount} workout${workoutCount === 1 ? "" : "s"}, ${prCount} new PR${prCount === 1 ? "" : "s"}, ${streak}-day streak. Keep it up →`;

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_RECAP_ID,
    content: { title: "Your week in GymCrew", body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 9, minute: 0 },
  });
}

/**
 * "You're X% stronger" nudge on the 1st of each month at 9am — only scheduled when
 * `computeStrongestMonthlyGain` finds a real, qualifying improvement; otherwise any pending one is
 * cancelled instead of sending a hollow notification this cycle.
 */
async function scheduleStrongerProgressReminder(unit: "kg" | "lbs"): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(STRONGER_PROGRESS_ID).catch(() => {});

  const gain = computeStrongestMonthlyGain(useWorkoutHistoryStore.getState().workouts);
  if (!gain) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const pct = Math.round(gain.percentChange);
  await Notifications.scheduleNotificationAsync({
    identifier: STRONGER_PROGRESS_ID,
    content: {
      title: "You're getting stronger",
      body: `💪 You're up ${pct}% on ${gain.exerciseName} this month — new estimated best: ${formatWeight(gain.currentBestKg, unit)}.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour: 9, minute: 0 },
  });
}

const CREW_MUSCLE_BALANCE_ID = "gymcrew-reminder-crew-muscle-balance";

/**
 * "Crew's skipping X this week" nudge, every Wednesday 6pm — mid-week rather than alongside the
 * Monday recap, since this one's meant to be acted on (there's still time left in the week to train
 * the group), not just read. Content is the crew's single most-neglected muscle group per
 * `mostNeglectedCrewMuscleGroup` — only scheduled when that resolves to a real group; cancelled
 * otherwise so a solo account or a genuinely balanced week never gets a hollow nudge.
 */
async function scheduleCrewMuscleBalanceReminder(neglectedGroup: ReturnType<typeof mostNeglectedCrewMuscleGroup>): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(CREW_MUSCLE_BALANCE_ID).catch(() => {});

  if (!neglectedGroup) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    identifier: CREW_MUSCLE_BALANCE_ID,
    content: {
      title: "Crew training tip",
      body: `Your crew's been skipping ${formatMuscleLabel(neglectedGroup).toLowerCase()} this week — anyone up for it?`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 4, hour: 18, minute: 0 },
  });
}

/**
 * Re-applies both reminder toggles' current effective state (`?? true`, same fallback the settings
 * screens use) to this device's actual OS-level schedule. Needed because a scheduled local
 * notification lives only on-device — it doesn't survive a reinstall or carry over to a new device
 * the way the boolean preference itself does (that's synced via the generic state blob). Called on
 * every signed-in app mount (see (tabs)/_layout.tsx) so a returning user's reminders actually exist
 * on whatever device they're on right now, not just the one they were toggled on originally.
 */
export async function reconcileNotificationSchedules(): Promise<void> {
  if (Platform.OS === "web") return;

  const onboarding = useOnboardingStore.getState().onboarding;

  const workoutEnabled = onboarding.workoutReminders ?? true;
  if (workoutEnabled) {
    const { defaultTime, title, body } = REMINDER_DEFAULTS.workout;
    await scheduleDailyReminder("workout", onboarding.workoutReminderTime ?? defaultTime, title, body);
  } else {
    await cancelDailyReminder("workout");
  }

  const creatineEnabled = onboarding.creatineReminders ?? true;
  if (creatineEnabled) {
    const { defaultTime, title, body } = REMINDER_DEFAULTS.creatine;
    await scheduleDailyReminder("creatine", onboarding.creatineReminderTime ?? defaultTime, title, body);
  } else {
    await cancelDailyReminder("creatine");
  }

  // Streak-loss piggybacks on "Workout Reminders" (already described in its own toggle as "Nudges to
  // keep your streak going") rather than adding a fourth settings row for essentially the same intent.
  if (workoutEnabled) {
    const workouts = useWorkoutHistoryStore.getState().workouts;
    const freezeDateKeys = useCurrencyStore.getState().freezeDateKeys;
    const now = new Date();
    const streak = computeCurrentStreak(workouts, now, freezeDateKeys);
    const trainedToday = workouts.some((workout) => !workout.isBackfilled && toDateKey(new Date(workout.completedAt)) === toDateKey(now));
    await scheduleStreakLossReminder(streak, trainedToday);
  } else {
    await Notifications.cancelScheduledNotificationAsync(STREAK_LOSS_ID).catch(() => {});
  }

  // Weekly recap and the "% stronger" nudge both piggyback on "Progress Updates" — the settings
  // screen already describes that toggle as covering "'You're X% stronger this month' style updates".
  const progressUpdatesEnabled = onboarding.progressUpdates ?? true;
  if (progressUpdatesEnabled) {
    const workouts = useWorkoutHistoryStore.getState().workouts;
    const freezeDateKeys = useCurrencyStore.getState().freezeDateKeys;
    const { workoutCount, prCount } = computeWeeklyRecap(workouts);
    const streak = computeCurrentStreak(workouts, new Date(), freezeDateKeys);
    await scheduleWeeklyRecapReminder(workoutCount, prCount, streak);
    await scheduleStrongerProgressReminder(useOnboardingStore.getState().weightUnit);
  } else {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(STRONGER_PROGRESS_ID).catch(() => {});
  }

  // Piggybacks on "Crew & Challenge Alerts" — a crew-wide signal (which muscle group the whole
  // crew is neglecting), not a personal one, so it belongs with the other crew-activity pushes
  // rather than "Progress Updates". Only meaningful with a real crew to aggregate across.
  const crewAlertsEnabled = onboarding.crewChallengeAlerts ?? true;
  const crewMembers = useCrewStore.getState().members;
  if (crewAlertsEnabled && crewMembers.length > 0) {
    const workouts = useWorkoutHistoryStore.getState().workouts;
    const membersActivity = useCrewActivityStore.getState().membersActivity;
    const neglectedGroup = mostNeglectedCrewMuscleGroup(crewMembers, workouts, membersActivity);
    await scheduleCrewMuscleBalanceReminder(neglectedGroup);
  } else {
    await Notifications.cancelScheduledNotificationAsync(CREW_MUSCLE_BALANCE_ID).catch(() => {});
  }
}
