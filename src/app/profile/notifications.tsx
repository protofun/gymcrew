import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { TimePickerModal } from "@/components/TimePickerModal";
import {
  cancelDailyReminder,
  reconcileNotificationSchedules,
  REMINDER_DEFAULTS,
  registerForPushNotifications,
  scheduleDailyReminder,
  type ReminderKind,
} from "@/lib/push-notifications";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type ToggleKey = "workoutReminders" | "crewChallengeAlerts" | "progressUpdates" | "marketingTips" | "creatineReminders";

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: "workoutReminders", label: "Workout Reminders", description: "Nudges to keep your streak going" },
  { key: "crewChallengeAlerts", label: "Crew & Challenge Alerts", description: "PRs from teammates and new challenges" },
  { key: "progressUpdates", label: "Progress Updates", description: "Weekly recaps and \"You're X% stronger\" updates" },
  { key: "creatineReminders", label: "Creatine Reminder", description: "A daily nudge to take your creatine" },
  { key: "marketingTips", label: "Tips & Product News", description: "Occasional training tips and app updates" },
];

/** The two toggles with a user-editable time-of-day (see lib/push-notifications.ts). Workout
 * Reminders also gates the streak-loss nudge, and Progress Updates gates the weekly recap and "%
 * stronger" nudge — both real on-device schedules too, just without a picker since their timing
 * isn't user-configurable (see `handleToggle`'s `reconcileNotificationSchedules()` call). Crew
 * Alerts/Tips remain server-pushed or not time-of-day based. */
const REMINDER_TOGGLE_KEY: Record<ReminderKind, ToggleKey> = { workout: "workoutReminders", creatine: "creatineReminders" };
const REMINDER_LABEL: Record<ReminderKind, string> = { workout: "Workout Reminder Time", creatine: "Creatine Reminder Time" };

function formatTimeLabel(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const reminderTime: Record<ReminderKind, string> = {
    workout: onboarding.workoutReminderTime ?? REMINDER_DEFAULTS.workout.defaultTime,
    creatine: onboarding.creatineReminderTime ?? REMINDER_DEFAULTS.creatine.defaultTime,
  };
  const [editingReminder, setEditingReminder] = useState<ReminderKind | null>(null);

  function reminderKindForToggle(key: ToggleKey): ReminderKind | null {
    if (key === "workoutReminders") return "workout";
    if (key === "creatineReminders") return "creatine";
    return null;
  }

  async function handleToggle(key: ToggleKey, value: boolean) {
    setOnboardingData({ [key]: value });
    posthog.capture("notification_setting_changed", { setting: key, enabled: value });

    if (value) await registerForPushNotifications();

    const kind = reminderKindForToggle(key);
    if (kind) {
      if (value) {
        const { title, body } = REMINDER_DEFAULTS[kind];
        await scheduleDailyReminder(kind, reminderTime[kind], title, body);
      } else {
        await cancelDailyReminder(kind);
      }
    }

    // Workout Reminders also gates the streak-loss nudge, and Progress Updates gates the weekly
    // recap + "% stronger" nudge — both need a full reconcile since their content depends on
    // current workout data, not just this one toggle (see push-notifications.ts).
    if (key === "workoutReminders" || key === "progressUpdates") {
      await reconcileNotificationSchedules();
    }
  }

  async function handleTimeSelected(kind: ReminderKind, time: string) {
    const { title, body } = REMINDER_DEFAULTS[kind];
    setOnboardingData({ [kind === "workout" ? "workoutReminderTime" : "creatineReminderTime"]: time });
    setEditingReminder(null);
    if (onboarding[REMINDER_TOGGLE_KEY[kind]] ?? true) {
      await scheduleDailyReminder(kind, time, title, body);
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/profile")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {TOGGLES.map((toggle) => {
          const enabled = onboarding[toggle.key] ?? true;
          const kind = reminderKindForToggle(toggle.key);
          return (
            <View key={toggle.key} className="gap-3 rounded-2xl border border-divider bg-surface px-4 py-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="body-md text-text-primary">{toggle.label}</Text>
                  <Text className="body-sm text-text-secondary">{toggle.description}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => handleToggle(toggle.key, value)}
                  trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
                  thumbColor={colors.brand.white}
                />
              </View>

              {kind && enabled && (
                <Pressable
                  onPress={() => setEditingReminder(kind)}
                  className="flex-row items-center justify-between rounded-xl border-t border-divider pt-3"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={16} color={colors.neutral.textSecondary} />
                    <Text className="body-sm text-text-secondary">Remind me at</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="body-sm font-body-semibold text-brand-yellow">{formatTimeLabel(reminderTime[kind])}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
                  </View>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      <TimePickerModal
        visible={editingReminder !== null}
        title={editingReminder ? REMINDER_LABEL[editingReminder] : undefined}
        value={editingReminder ? reminderTime[editingReminder] : "09:00"}
        onClose={() => setEditingReminder(null)}
        onSelect={(time) => {
          if (editingReminder) handleTimeSelected(editingReminder, time);
        }}
      />
    </View>
  );
}
