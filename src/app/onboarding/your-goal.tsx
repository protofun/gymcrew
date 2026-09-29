import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SelectTile } from "@/components/SelectTile";
import { navIcons, nutritionIcons } from "@/constants/images";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { spring } from "@/theme";

const GOALS = [
  { key: "build-muscle", label: "Build Muscle", image: navIcons.muscles },
  { key: "lose-weight", label: "Lose Weight", image: navIcons.nutrition },
  { key: "get-stronger", label: "Get Stronger", image: navIcons.prs },
  { key: "improve-fitness", label: "Improve Fitness", image: navIcons.streak },
  { key: "stay-healthy", label: "Stay Healthy", image: navIcons.bodyLog },
  { key: "other", label: "Other", image: nutritionIcons.more },
] as const;

export default function YourGoalScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const [selected, setSelected] = useState<string>("build-muscle");
  const posthog = usePostHog();

  function handleContinue() {
    setOnboardingData({ goal: selected });
    posthog.capture("onboarding_goal_selected", { goal: selected });
    router.push("/onboarding/training-experience");
  }

  return (
    <OnboardingScreen progress={onboardingProgress("your-goal")} title="Your Goal" subtitle="What do you want to achieve?" footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <View className="flex-row flex-wrap justify-between gap-y-3.5">
        {GOALS.map((goal, index) => (
          <Animated.View key={goal.key} entering={FadeInUp.delay(380 + index * 70).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)} style={{ width: "48%" }}>
            <SelectTile selected={selected === goal.key} onPress={() => setSelected(goal.key)} title={goal.label} image={goal.image} />
          </Animated.View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
