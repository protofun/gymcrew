import { router } from "expo-router";
import { useState } from "react";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ToggleRow } from "@/components/ToggleRow";
import { navIcons, nutritionIcons } from "@/constants/images";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { registerForPushNotifications, reconcileNotificationSchedules } from "@/lib/push-notifications";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function NotificationsScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const posthog = usePostHog();
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [crewChallenges, setCrewChallenges] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(true);
  const [marketingTips, setMarketingTips] = useState(false);

  async function handleContinue() {
    setOnboardingData({
      workoutReminders,
      crewChallengeAlerts: crewChallenges,
      progressUpdates,
      marketingTips,
    });
    completeOnboarding();
    posthog.capture("onboarding_completed");

    // Fire-and-forget: the permission prompt (if needed) and the actual on-device scheduling
    // shouldn't block getting to the next screen. Creatine reminders aren't asked about here (see
    // profile/notifications.tsx — a separate settings screen), but default to enabled, so this
    // reconciles that one's schedule too rather than leaving it unscheduled until the user happens
    // to visit that screen.
    registerForPushNotifications().then(reconcileNotificationSchedules);

    router.push("/onboarding/all-set");
  }

  return (
    <OnboardingScreen progress={onboardingProgress("notifications")} title="Notifications" subtitle="Stay on track with reminders and updates." footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <ToggleRow title="Workout Reminders" subtitle="Get reminded to train" image={navIcons.workouts} value={workoutReminders} onValueChange={setWorkoutReminders} />
      <ToggleRow title="Crew Challenges" subtitle="Don't miss any challenges" image={navIcons.challenges} value={crewChallenges} onValueChange={setCrewChallenges} />
      <ToggleRow title="Progress Updates" subtitle="Weekly progress summary" image={navIcons.progress} value={progressUpdates} onValueChange={setProgressUpdates} />
      <ToggleRow title="Marketing & Tips" subtitle="Tips, news and offers" image={nutritionIcons.more} value={marketingTips} onValueChange={setMarketingTips} />
    </OnboardingScreen>
  );
}
