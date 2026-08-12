import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { router } from "expo-router";

import { FormField } from "@/components/FormField";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { OnboardingHeader } from "@/components/OnboardingHeader";
import { UnitToggle } from "@/components/UnitToggle";
import { useUnitToggle } from "@/hooks/use-unit-toggle";
import { colors } from "@/theme";

const CM_TO_IN = 0.393701;
const KG_TO_LB = 2.20462;

type Gender = "male" | "female";

export default function YourStatsScreen() {
  const [age, setAge] = useState("24");
  const [gender, setGender] = useState<Gender>("male");
  const height = useUnitToggle({ initialValue: "180", units: ["cm", "in"], factor: CM_TO_IN });
  const weight = useUnitToggle({ initialValue: "75", units: ["kg", "lb"], factor: KG_TO_LB });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 px-6 pb-6 pt-4">
        <OnboardingHeader title="Your Stats" subtitle="Help us personalize your experience." />

        <Animated.ScrollView entering={FadeInUp.delay(200).springify().damping(14).mass(0.6)} className="flex-1" contentContainerClassName="flex-grow justify-center gap-6 py-6" showsVerticalScrollIndicator={false}>
          <FormField
            label="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            rightAdornment={<Text className="body-md text-text-secondary">years</Text>}
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

          <FormField
            label="Height"
            value={height.value}
            onChangeText={height.setValue}
            keyboardType="decimal-pad"
            rightAdornment={<UnitToggle unit={height.unit} onPress={height.toggle} />}
          />

          <FormField
            label="Weight"
            value={weight.value}
            onChangeText={weight.setValue}
            keyboardType="decimal-pad"
            rightAdornment={<UnitToggle unit={weight.unit} onPress={weight.toggle} />}
          />
        </Animated.ScrollView>

        <OnboardingFooter label="Continue" activeIndex={3} onPress={() => router.push("/onboarding/your-goal")} />
      </View>
    </SafeAreaView>
  );
}
