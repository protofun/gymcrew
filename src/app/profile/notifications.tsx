import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TimePickerModal } from "@/components/TimePickerModal";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type ToggleKey = "workoutReminders" | "crewChallengeAlerts" | "progressUpdates" | "marketingTips" | "creatineReminders";

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: "workoutReminders", label: "Workout Reminders", description: "Nudges to keep your streak going" },
  { key: "crewChallengeAlerts", label: "Crew & Challenge Alerts", description: "PRs from teammates and new challenges" },
  { key: "progressUpdates", label: "Progress Updates", description: "\"You're X% stronger this month\" style updates" },
  { key: "creatineReminders", label: "Creatine Reminder", description: "A daily nudge to take your creatine" },
  { key: "marketingTips", label: "Tips & Product News", description: "Occasional training tips and app updates" },
];

function formatTimeLabel(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const creatineReminderTime = onboarding.creatineReminderTime ?? "09:00";
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {TOGGLES.map((toggle) => {
          const enabled = onboarding[toggle.key] ?? true;
          return (
            <View key={toggle.key} className="gap-3 rounded-2xl border border-divider bg-surface px-4 py-3.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="body-md text-text-primary">{toggle.label}</Text>
                  <Text className="body-sm text-text-secondary">{toggle.description}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => setOnboardingData({ [toggle.key]: value })}
                  trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
                  thumbColor={colors.brand.white}
                />
              </View>

              {toggle.key === "creatineReminders" && enabled && (
                <Pressable
                  onPress={() => setTimePickerVisible(true)}
                  className="flex-row items-center justify-between rounded-xl border-t border-divider pt-3"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={16} color={colors.neutral.textSecondary} />
                    <Text className="body-sm text-text-secondary">Remind me at</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="body-sm font-body-semibold text-brand-yellow">{formatTimeLabel(creatineReminderTime)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
                  </View>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      <TimePickerModal
        visible={timePickerVisible}
        title="Creatine Reminder Time"
        value={creatineReminderTime}
        onClose={() => setTimePickerVisible(false)}
        onSelect={(time) => {
          setOnboardingData({ creatineReminderTime: time });
          setTimePickerVisible(false);
        }}
      />
    </View>
  );
}
