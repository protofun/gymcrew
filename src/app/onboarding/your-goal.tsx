import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { colors } from "@/theme";

const GOALS = [
  { key: "build-muscle", label: "Build Muscle", icon: "dumbbell" },
  { key: "lose-weight", label: "Lose Weight", icon: "fire" },
  { key: "get-stronger", label: "Get Stronger", icon: "lightning-bolt-outline" },
  { key: "improve-fitness", label: "Improve Fitness", icon: "heart-outline" },
  { key: "stay-healthy", label: "Stay Healthy", icon: "leaf" },
  { key: "other", label: "Other", icon: "dots-horizontal" },
] as const satisfies readonly { key: string; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[];

export default function YourGoalScreen() {
  const [selected, setSelected] = useState<string>("build-muscle");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Goal" subtitle="What do you want to achieve?" />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center py-6" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {GOALS.map((goal) => {
              const active = selected === goal.key;
              return (
                <Pressable
                  key={goal.key}
                  onPress={() => setSelected(goal.key)}
                  className={`w-[48%] items-center gap-3 rounded-xl border bg-surface py-6 ${
                    active ? "border-brand-yellow" : "border-divider"
                  }`}
                >
                  <MaterialCommunityIcons
                    name={goal.icon}
                    size={28}
                    color={active ? colors.brand.yellow : colors.neutral.textPrimary}
                  />
                  <Text className="body-md text-text-primary">{goal.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.ScrollView>

        <OnboardingFooter
          label="Continue"
          activeIndex={1}
          onPress={() => router.push("/onboarding/training-experience")}
        />
      </View>
    </SafeAreaView>
  );
}
