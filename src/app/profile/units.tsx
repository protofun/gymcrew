import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kgToLbs } from "@/lib/units";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

const UNIT_OPTIONS: { key: "kg" | "lbs"; label: string; description: string }[] = [
  { key: "kg", label: "Kilograms (kg)", description: "Used by most of the world — the default." },
  { key: "lbs", label: "Pounds (lbs)", description: "Common in the US." },
];

export default function UnitsScreen() {
  const insets = useSafeAreaInsets();
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const setWeightUnit = useOnboardingStore((state) => state.setWeightUnit);
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Units</Text>
      </View>

      <View className="gap-3 px-4 pt-6">
        <Text className="body-sm text-text-secondary">
          Sets a new workout&apos;s default weight unit. Existing logs and ranks are unaffected and always stored in kg.
        </Text>

        {UNIT_OPTIONS.map((option) => {
          const active = option.key === weightUnit;
          return (
            <Pressable
              key={option.key}
              onPress={() => setWeightUnit(option.key)}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${active ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-surface"}`}
            >
              <View className="flex-1 gap-0.5">
                <Text className="body-md font-body-semibold text-text-primary">{option.label}</Text>
                <Text className="body-sm text-text-secondary">{option.description}</Text>
                <Text className="caption text-text-secondary">
                  Your weight: {option.key === "kg" ? `${weightKg}kg` : `${kgToLbs(weightKg)}lbs`}
                </Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={colors.brand.yellow} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
