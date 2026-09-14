import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api, isApiConfigured } from "@/lib/api";
import { useOnboardingStore } from "@/store/onboarding-store";

// Foreground notifications are silent by default in expo-notifications — without this, a push that
// arrives while the app is open never shows anything at all.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
}
