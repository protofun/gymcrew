import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SelectTile } from "@/components/SelectTile";
import { rankTierImages } from "@/constants/images";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { spring } from "@/theme";

// Each level gets the rank medal it would roughly start at — a first taste of the rank system.
const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", duration: "0-6 months", image: rankTierImages.rookie },
  { key: "intermediate", label: "Intermediate", duration: "6 months - 2 years", image: rankTierImages.bronze },
  { key: "advanced", label: "Advanced", duration: "2 - 5 years", image: rankTierImages.gold },
  { key: "elite", label: "Elite", duration: "5+ years", image: rankTierImages.platinum },
] as const;

export default function TrainingExperienceScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const posthog = usePostHog();
  const [selected, setSelected] = useState<string>("intermediate");

  function handleContinue() {
    setOnboardingData({ experienceLevel: selected });
    posthog.capture("onboarding_experience_selected", { experienceLevel: selected });
    router.push("/onboarding/your-metrics");
  }

  return (
    <OnboardingScreen progress={onboardingProgress("training-experience")} title="Training Experience" subtitle="How experienced are you in the gym?" footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <View className="gap-3">
        {EXPERIENCE_LEVELS.map((level, index) => (
          <Animated.View key={level.key} entering={FadeInUp.delay(380 + index * 80).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}>
            <SelectTile layout="row" selected={selected === level.key} onPress={() => setSelected(level.key)} title={level.label} caption={level.duration} image={level.image} />
          </Animated.View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
