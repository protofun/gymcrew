import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { MetricRows } from "@/components/MetricRows";
import { FieldLabel, OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ElasticSlider } from "@/components/ui/micro-interactions/elastic-slider";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { exerciseImages } from "@/constants/images";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

const KG_TO_LB = 2.20462;

export default function YourMetricsScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const posthog = usePostHog();
  // The lifts are kept in kg and only shown in the chosen unit, so switching it never loses precision.
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [lifts, setLifts] = useState({ benchPress: 80, squat: 100, deadlift: 120 });
  const [bodyFat, setBodyFat] = useState(15);

  const shown = (kg: number) => (unit === "kg" ? kg : Math.round(kg * KG_TO_LB));
  const common = { unit, min: 0, max: unit === "kg" ? 300 : 660, step: unit === "kg" ? 2.5 : 5, decimals: unit === "kg" ? 1 : 0, unitOptions: ["kg", "lb"] as const, onUnitChange: (next: string) => setUnit(next === "lb" ? "lb" : "kg") };

  function handleContinue() {
    setOnboardingData({
      benchPress1RM: lifts.benchPress,
      squat1RM: lifts.squat,
      deadlift1RM: lifts.deadlift,
      bodyFatPercent: bodyFat,
    });
    posthog.capture("onboarding_metrics_completed");
    router.push("/onboarding/rank-reveal");
  }

  return (
    <OnboardingScreen progress={onboardingProgress("your-metrics")} title="Your Metrics" subtitle="Let's track your starting point — your best single rep on each lift." footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <MetricRows
        onChange={(key, value) => setLifts((prev) => ({ ...prev, [key]: unit === "kg" ? value : value / KG_TO_LB }))}
        rows={[
          { key: "benchPress", label: "Bench Press", value: shown(lifts.benchPress), image: exerciseImages.benchPress, ...common },
          { key: "squat", label: "Squat", value: shown(lifts.squat), image: exerciseImages.squat, ...common },
          { key: "deadlift", label: "Deadlift", value: shown(lifts.deadlift), image: exerciseImages.deadlift, ...common },
        ]}
      />

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <FieldLabel>Body fat (optional)</FieldLabel>
          <View className="flex-row items-baseline gap-1">
            <NumberFlow value={bodyFat} fontSize={26} color={colors.brand.yellow} fontWeight="800" />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>%</Text>
          </View>
        </View>
        <ElasticSlider.Root value={bodyFat} min={3} max={50} step={1} isStepped onValueChange={setBodyFat} style={{ width: "100%" }}>
          <ElasticSlider.Leading>
            <Ionicons name="remove" size={16} color={colors.neutral.textSecondary} />
          </ElasticSlider.Leading>
          <ElasticSlider.Track color={colors.neutral.divider}>
            <ElasticSlider.Fill color={colors.brand.yellow} />
          </ElasticSlider.Track>
          <ElasticSlider.Trailing>
            <Ionicons name="add" size={16} color={colors.neutral.textSecondary} />
          </ElasticSlider.Trailing>
        </ElasticSlider.Root>
      </View>
    </OnboardingScreen>
  );
}
