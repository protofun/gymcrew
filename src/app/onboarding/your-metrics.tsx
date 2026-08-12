import { useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { FormField } from "@/components/FormField";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { UnitToggle } from "@/components/UnitToggle";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { colors } from "@/theme";

const KG_TO_LB = 2.20462;

export default function YourMetricsScreen() {
  const benchPress = useUnitToggle({ initialValue: "80", units: ["kg", "lb"], factor: KG_TO_LB });
  const squat = useUnitToggle({ initialValue: "100", units: ["kg", "lb"], factor: KG_TO_LB });
  const deadlift = useUnitToggle({ initialValue: "120", units: ["kg", "lb"], factor: KG_TO_LB });
  const [bodyFat, setBodyFat] = useState("15");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Metrics" subtitle="Let's track your starting point." />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center gap-6 py-6" showsVerticalScrollIndicator={false}>
          <FormField
            label="Bench Press (1RM)"
            value={benchPress.value}
            onChangeText={benchPress.setValue}
            keyboardType="decimal-pad"
            rightAdornment={<UnitToggle unit={benchPress.unit} onPress={benchPress.toggle} />}
          />
          <FormField
            label="Squat (1RM)"
            value={squat.value}
            onChangeText={squat.setValue}
            keyboardType="decimal-pad"
            rightAdornment={<UnitToggle unit={squat.unit} onPress={squat.toggle} />}
          />
          <FormField
            label="Deadlift (1RM)"
            value={deadlift.value}
            onChangeText={deadlift.setValue}
            keyboardType="decimal-pad"
            rightAdornment={<UnitToggle unit={deadlift.unit} onPress={deadlift.toggle} />}
          />
          <FormField
            label="Body Fat % (optional)"
            value={bodyFat}
            onChangeText={setBodyFat}
            keyboardType="number-pad"
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
