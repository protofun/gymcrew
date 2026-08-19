import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DivisionBadge } from "@/components/DivisionBadge";
import { DIVISIONS, divisionIndex } from "@/lib/division";
import { useCrewStore } from "@/store/crew-store";
import { colors } from "@/theme";

export default function AllDivisionsScreen() {
  const insets = useSafeAreaInsets();
  const division = useCrewStore((state) => state.division);
  const currentIndex = divisionIndex(division);

  // Highest division first, like a ranked ladder poster.
  const steps = [...DIVISIONS].reverse();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">All Divisions</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {steps.map((step) => {
          const stepIndex = divisionIndex(step);
          const isCurrent = stepIndex === currentIndex;
          const isAchieved = stepIndex <= currentIndex;

          return (
            <View
              key={step}
              className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
                isCurrent ? "border-brand-yellow bg-brand-yellow/10" : "border-divider bg-surface"
              }`}
            >
              <DivisionBadge division={step} size={40} dimmed={!isAchieved} />

              <Text
                className={`body-md flex-1 font-body-semibold ${isCurrent ? "text-brand-yellow" : isAchieved ? "text-text-primary" : "text-text-secondary"}`}
              >
                {step}
              </Text>

              {isCurrent ? (
                <View className="rounded-full bg-brand-yellow px-2.5 py-1">
                  <Text className="caption font-body-bold text-brand-iron">YOU</Text>
                </View>
              ) : isAchieved ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success} />
              ) : (
                <Ionicons name="lock-closed" size={16} color={colors.neutral.textSecondary} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
