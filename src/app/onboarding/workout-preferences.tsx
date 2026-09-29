import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { FieldLabel, OnboardingScreen } from "@/components/OnboardingScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SearchableSelectField } from "@/components/SearchableSelectField";
import { SegmentedField } from "@/components/SegmentedField";
import { ToggleRow } from "@/components/ToggleRow";
import { ElasticSlider } from "@/components/ui/micro-interactions/elastic-slider";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { navIcons } from "@/constants/images";
import { TRAINING_SPLITS } from "@/data/training-splits";
import { onboardingProgress } from "@/lib/onboarding-steps";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

const DURATIONS = [
  { key: "30 min", label: "30 min" },
  { key: "45 min", label: "45 min" },
  { key: "60+ min", label: "60+ min" },
] as const;
const MIN_WORKOUTS_PER_WEEK = 1;
const MAX_WORKOUTS_PER_WEEK = 7;

export default function WorkoutPreferencesScreen() {
  const setOnboardingData = useOnboardingStore((state) => state.setOnboardingData);
  const posthog = usePostHog();
  const [trainingSplit, setTrainingSplit] = useState<string>("Push / Pull / Legs");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(4);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]["key"]>("60+ min");
  const [restTimer, setRestTimer] = useState(true);

  function handleContinue() {
    setOnboardingData({
      trainingSplit,
      workoutsPerWeek,
      workoutDuration: duration,
      restTimerEnabled: restTimer,
    });
    posthog.capture("onboarding_preferences_completed", { trainingSplit, workoutsPerWeek });
    router.push("/onboarding/training-schedule");
  }

  return (
    <OnboardingScreen progress={onboardingProgress("workout-preferences")} title="Workout Preferences" subtitle="How do you like to train?" footer={<PrimaryButton label="Continue" onPress={handleContinue} />}>
      <SearchableSelectField variant="wizard" label="Training Split" value={trainingSplit} options={TRAINING_SPLITS} onChange={setTrainingSplit} />

      <View className="gap-3">
        <View className="flex-row items-baseline justify-between">
          <FieldLabel>Workouts per week</FieldLabel>
          <View className="flex-row items-baseline gap-1.5">
            <NumberFlow value={workoutsPerWeek} fontSize={30} color={colors.brand.yellow} fontWeight="800" />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>{workoutsPerWeek === 1 ? "day" : "days"}</Text>
          </View>
        </View>
        <ElasticSlider.Root value={workoutsPerWeek} min={MIN_WORKOUTS_PER_WEEK} max={MAX_WORKOUTS_PER_WEEK} step={1} isStepped onValueChange={setWorkoutsPerWeek} style={{ width: "100%" }}>
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

      <View className="gap-2">
        <FieldLabel>Workout duration</FieldLabel>
        <SegmentedField options={DURATIONS} value={duration} onChange={setDuration} />
      </View>

      <ToggleRow title="Rest Timer" subtitle="Counts down between your sets" image={navIcons.schedule} value={restTimer} onValueChange={setRestTimer} />
    </OnboardingScreen>
  );
}
