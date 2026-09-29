import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { MetricRows } from "@/components/MetricRows";
import { FieldLabel, OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SegmentedField } from "@/components/SegmentedField";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { type Gender, useOnboardingStore } from "@/store/onboarding-store";

const CM_TO_IN = 0.393701;
const KG_TO_LB = 2.20462;

const GENDERS = [
  { key: "male", label: "♂  Male" },
  { key: "female", label: "♀  Female" },
] as const;

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

  const setters: Record<string, (value: number) => void> = { age: setAge, height: height.setValue, weight: weight.setValue };

  return (
    <OnboardingScreen progress={onboardingProgress("your-stats")} title="Your Stats" subtitle="Help us personalize your experience." footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <View className="gap-2">
        <FieldLabel>Gender</FieldLabel>
        <SegmentedField options={GENDERS} value={gender} onChange={setGender} />
      </View>

      <MetricRows
        onChange={(key, value) => setters[key]?.(value)}
        rows={[
          { key: "age", label: "Age", value: age, unit: "years", min: 13, max: 90, step: 1 },
          {
            key: "height",
            label: "Height",
            value: height.value,
            unit: height.unit,
            min: height.unit === "cm" ? 120 : 47,
            max: height.unit === "cm" ? 220 : 87,
            step: height.unit === "cm" ? 1 : 0.5,
            decimals: height.unit === "cm" ? 0 : 1,
            unitOptions: ["cm", "in"],
            onUnitChange: (unit) => unit !== height.unit && height.toggle(),
          },
          {
            key: "weight",
            label: "Weight",
            value: weight.value,
            unit: weight.unit,
            min: weight.unit === "kg" ? 30 : 66,
            max: weight.unit === "kg" ? 200 : 440,
            step: weight.unit === "kg" ? 0.5 : 1,
            decimals: weight.unit === "kg" ? 1 : 0,
            unitOptions: ["kg", "lb"],
            onUnitChange: (unit) => unit !== weight.unit && weight.toggle(),
          },
        ]}
      />
    </OnboardingScreen>
  );
}
