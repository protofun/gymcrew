import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type ToggleKey = "workoutReminders" | "crewChallengeAlerts" | "progressUpdates" | "marketingTips";

const TOGGLES: { key: ToggleKey; label: string; description: string }[] = [
  { key: "workoutReminders", label: "Workout Reminders", description: "Nudges to keep your streak going" },
  { key: "crewChallengeAlerts", label: "Crew & Challenge Alerts", description: "PRs from teammates and new challenges" },
  { key: "progressUpdates", label: "Progress Updates", description: "\"You're X% stronger this month\" style updates" },
  { key: "marketingTips", label: "Tips & Product News", description: "Occasional training tips and app updates" },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Notifications</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {TOGGLES.map((toggle) => (
          <View key={toggle.key} className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="body-md text-text-primary">{toggle.label}</Text>
              <Text className="body-sm text-text-secondary">{toggle.description}</Text>
            </View>
            <Switch
              value={onboarding[toggle.key] ?? true}
              onValueChange={(value) => setOnboardingData({ [toggle.key]: value })}
              trackColor={{ false: colors.neutral.divider, true: colors.brand.yellow }}
              thumbColor={colors.brand.white}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
