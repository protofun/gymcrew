import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { kgToLbs } from "@/lib/units";
import type { WeightUnit } from "@/store/active-workout-store";
import { colors } from "@/theme";

export function SnapshotBanner({
  asOfMs,
  weightKg,
  weightUnit,
  onExit,
}: {
  asOfMs: number;
  weightKg: number;
  weightUnit: WeightUnit;
  onExit: () => void;
}) {
  const displayWeight = weightUnit === "kg" ? weightKg : kgToLbs(weightKg);

  return (
    <View className="flex-row items-center gap-3 border-b border-brand-yellow bg-surface px-4 py-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-background">
        <Ionicons name="time" size={15} color={colors.brand.yellow} />
      </View>
      <View className="flex-1">
        <Text className="body-sm font-body-bold text-brand-yellow">
          Viewing at {displayWeight} {weightUnit}
        </Text>
        <Text className="caption text-text-secondary">
          {new Date(asOfMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      <Pressable onPress={onExit} hitSlop={8} className="flex-row items-center gap-1 rounded-full border border-divider px-3 py-1.5">
        <Ionicons name="close" size={12} color={colors.neutral.textSecondary} />
        <Text className="caption font-body-semibold text-text-secondary">Exit</Text>
      </Pressable>
    </View>
  );
}
