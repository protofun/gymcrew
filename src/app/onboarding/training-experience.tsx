import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { colors } from "@/theme";

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "Beginner", duration: "0-6 months" },
  { key: "intermediate", label: "Intermediate", duration: "6 months - 2 years" },
  { key: "advanced", label: "Advanced", duration: "2 - 5 years" },
  { key: "elite", label: "Elite", duration: "5+ years" },
] as const;

export default function TrainingExperienceScreen() {
  const [selected, setSelected] = useState<string>("intermediate");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Training Experience" subtitle="How experienced are you in the gym?" />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center gap-4 py-6" showsVerticalScrollIndicator={false}>
          {EXPERIENCE_LEVELS.map((level) => {
            const active = selected === level.key;
            return (
              <Pressable
                key={level.key}
                onPress={() => setSelected(level.key)}
                className={`flex-row items-center justify-between rounded-xl border bg-surface px-4 py-4 ${
                  active ? "border-brand-yellow" : "border-divider"
                }`}
              >
                <Text className="body-md text-text-primary">{level.label}</Text>
                <Text className="body-sm text-text-secondary">{level.duration}</Text>
              </Pressable>
            );
          })}
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={2} onPress={() => router.push("/onboarding/your-metrics")} />
      </View>
    </SafeAreaView>
  );
}
