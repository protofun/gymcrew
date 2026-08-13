import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { SliderField } from "@/components/SliderField";
import { Stepper } from "@/components/Stepper";
import { UnitToggle } from "@/components/UnitToggle";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { colors } from "@/theme";

const CM_TO_IN = 0.393701;
const KG_TO_LB = 2.20462;

type Gender = "male" | "female";

export default function YourStatsScreen() {
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>("male");
  const height = useUnitToggle({ initialValue: 180, units: ["cm", "in"], factor: CM_TO_IN });
  const weight = useUnitToggle({ initialValue: 75, units: ["kg", "lb"], factor: KG_TO_LB });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Stats" subtitle="Help us personalize your experience." />

        <Animated.ScrollView
          entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)}
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
            <View className="flex-row gap-3">
              {(["male", "female"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setGender(option)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-4 ${
                    gender === option ? "border-brand-yellow" : "border-divider"
                  } bg-surface`}
                >
                  <Text className="text-lg text-text-primary">{option === "male" ? "♂" : "♀"}</Text>
                  <Text className="body-md text-text-primary">{option === "male" ? "Male" : "Female"}</Text>
                </Pressable>
              ))}
            </View>
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

        <OnboardingFooter label="Continue" activeIndex={3} onPress={() => router.push("/onboarding/your-goal")} />
      </View>
    </SafeAreaView>
  );
}
