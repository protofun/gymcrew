import { useState } from "react";
import { SafeAreaView, Switch, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type NotificationRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function NotificationRow({ title, subtitle, value, onValueChange }: NotificationRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-divider bg-surface px-4 py-4">
      <View className="flex-1 gap-1 pr-3">
        <Text className="body-md text-text-primary">{title}</Text>
        <Text className="body-sm text-text-secondary">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.neutral.divider, true: colors.brand.green }}
        thumbColor={colors.brand.white}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [crewChallenges, setCrewChallenges] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(true);
  const [marketingTips, setMarketingTips] = useState(false);

  function handleContinue() {
    setOnboardingData({
      workoutReminders,
      crewChallengeAlerts: crewChallenges,
      progressUpdates,
      marketingTips,
    });
    completeOnboarding();
    router.push("/onboarding/all-set");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Notifications" subtitle="Stay on track with reminders and updates." />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center gap-4 py-6" showsVerticalScrollIndicator={false}>
          <NotificationRow
            title="Workout Reminders"
            subtitle="Get reminded to train"
            value={workoutReminders}
            onValueChange={setWorkoutReminders}
          />
          <NotificationRow
            title="Crew Challenges"
            subtitle="Don't miss any challenges"
            value={crewChallenges}
            onValueChange={setCrewChallenges}
          />
          <NotificationRow
            title="Progress Updates"
            subtitle="Weekly progress summary"
            value={progressUpdates}
            onValueChange={setProgressUpdates}
          />
          <NotificationRow
            title="Marketing & Tips"
            subtitle="Tips, news and offers"
            value={marketingTips}
            onValueChange={setMarketingTips}
          />
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={3} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
