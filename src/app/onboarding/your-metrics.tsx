import { useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { Stepper } from "@/components/Stepper";
import { UnitToggle } from "@/components/UnitToggle";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { colors } from "@/theme";

const KG_TO_LB = 2.20462;

function liftStepperProps(unit: string) {
  return {
    step: unit === "kg" ? 2.5 : 5,
    min: 0,
    max: unit === "kg" ? 300 : 660,
    decimals: unit === "kg" ? 1 : 0,
  };
}

export default function YourMetricsScreen() {
  const benchPress = useUnitToggle({ initialValue: 80, units: ["kg", "lb"], factor: KG_TO_LB });
  const squat = useUnitToggle({ initialValue: 100, units: ["kg", "lb"], factor: KG_TO_LB });
  const deadlift = useUnitToggle({ initialValue: 120, units: ["kg", "lb"], factor: KG_TO_LB });
  const [bodyFat, setBodyFat] = useState(15);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Metrics" subtitle="Let's track your starting point." />

        <Animated.ScrollView
          entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)}
          className="flex-1"
          contentContainerClassName="flex-grow justify-center gap-6 py-6"
          showsVerticalScrollIndicator={false}
        >
          <Stepper
            label="Bench Press (1RM)"
            value={benchPress.value}
            onChange={benchPress.setValue}
            {...liftStepperProps(benchPress.unit)}
            rightAdornment={<UnitToggle unit={benchPress.unit} onPress={benchPress.toggle} />}
          />
          <Stepper
            label="Squat (1RM)"
            value={squat.value}
            onChange={squat.setValue}
            {...liftStepperProps(squat.unit)}
            rightAdornment={<UnitToggle unit={squat.unit} onPress={squat.toggle} />}
          />
          <Stepper
            label="Deadlift (1RM)"
            value={deadlift.value}
            onChange={deadlift.setValue}
            {...liftStepperProps(deadlift.unit)}
            rightAdornment={<UnitToggle unit={deadlift.unit} onPress={deadlift.toggle} />}
          />
          <Stepper
            label="Body Fat % (optional)"
            value={bodyFat}
            onChange={setBodyFat}
            step={1}
            min={3}
            max={50}
            rightAdornment={<Text className="body-md text-text-secondary">%</Text>}
          />
        </Animated.ScrollView>

        <OnboardingFooter
          label="Continue"
          activeIndex={2}
          onPress={() => router.push("/onboarding/workout-preferences")}
        />
      </View>
    </SafeAreaView>
  );
}
