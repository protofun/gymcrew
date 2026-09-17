import { useState } from "react";
import { Dimensions, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

import SegmentedControl from "@/components/ui/organisms/segmented-control";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { SliderField } from "@/components/SliderField";
import { Stepper } from "@/components/Stepper";
import { UnitToggle } from "@/components/UnitToggle";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { type Gender, useOnboardingStore } from "@/store/onboarding-store";
import { colors, spring } from "@/theme";

const GENDER_OPTIONS: { value: Gender; icon: string; label: string }[] = [
  { value: "male", icon: "♂", label: "Male" },
  { value: "female", icon: "♀", label: "Female" },
];
// Screen uses px-6 (24px each side); segmented control needs an explicit width (defaults to
// full-bleed screen width otherwise).
const SEGMENTED_CONTROL_WIDTH = Dimensions.get("window").width - 48;

const CM_TO_IN = 0.393701;
const KG_TO_LB = 2.20462;

export default function YourStatsScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const posthog = usePostHog();
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>("male");
  const height = useUnitToggle({ initialValue: 180, units: ["cm", "in"], factor: CM_TO_IN });
  const weight = useUnitToggle({ initialValue: 75, units: ["kg", "lb"], factor: KG_TO_LB });

  function handleContinue() {
    const heightCm = height.unit === "cm" ? height.value : height.value / CM_TO_IN;
    const weightKg = weight.unit === "kg" ? weight.value : weight.value / KG_TO_LB;
    setOnboardingData({ age, gender, heightCm, weightKg });
    posthog.capture("onboarding_stats_completed", { age, gender });
    router.push("/onboarding/your-goal");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Stats" subtitle="Help us personalize your experience." />

        <Animated.ScrollView
          entering={FadeInUp.delay(200).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 py-6"
          showsVerticalScrollIndicator={false}
        >
          <SliderField
            label="Age"
            value={age}
            onChange={setAge}
            step={1}
            min={13}
            max={90}
            rightAdornment={<Text className="body-md text-text-secondary"> years</Text>}
          />

          <View className="gap-2">
            <Text className="body-md text-text-primary">Gender</Text>
            <SegmentedControl
              currentIndex={GENDER_OPTIONS.findIndex((option) => option.value === gender)}
              onChange={(index) => setGender(GENDER_OPTIONS[index].value)}
              width={SEGMENTED_CONTROL_WIDTH}
              borderRadius={12}
              segmentedControlBackgroundColor={colors.neutral.surface}
              activeSegmentBackgroundColor={colors.brand.yellow}
              dividerColor={colors.neutral.divider}
            >
              {GENDER_OPTIONS.map((option) => (
                <View key={option.value} className="flex-row items-center justify-center gap-2 py-2">
                  <Text className={gender === option.value ? "text-brand-iron" : "text-text-primary"}>{option.icon}</Text>
                  <Text className={`body-md ${gender === option.value ? "text-brand-iron" : "text-text-primary"}`}>{option.label}</Text>
                </View>
              ))}
            </SegmentedControl>
          </View>

          <SliderField
            label="Height"
            value={height.value}
            onChange={height.setValue}
            step={height.unit === "cm" ? 1 : 0.5}
            min={height.unit === "cm" ? 120 : 47}
            max={height.unit === "cm" ? 220 : 87}
            decimals={height.unit === "cm" ? 0 : 1}
            rightAdornment={<UnitToggle unit={height.unit} onPress={height.toggle} />}
          />

          <Stepper
            label="Weight"
            value={weight.value}
            onChange={weight.setValue}
            step={weight.unit === "kg" ? 0.5 : 1}
            min={weight.unit === "kg" ? 30 : 66}
            max={weight.unit === "kg" ? 200 : 440}
            decimals={weight.unit === "kg" ? 1 : 0}
            rightAdornment={<UnitToggle unit={weight.unit} onPress={weight.toggle} />}
          />
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={3} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
