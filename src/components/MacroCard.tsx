import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { IconBadge } from "@/components/IconBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { SkewedStat } from "@/components/SkewedStat";
import { colors } from "@/theme";

type MacroCardProps = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  currentG: number;
  targetG: number;
  color: string;
};

/** One macro's card on the Nutrition dashboard — a plain bordered `bg-surface` card (same as every
 * other card in the app) with a small tinted `IconBadge`, a big skewed stat number, and a gamified
 * "Xg to go" line instead of a flat "Remaining: X" (see NUTRITION.md section 2). Hitting the target
 * swaps the icon for a checkmark rather than just stopping at 0, matching the app's "motivation, not
 * shame" rule for nutrition (section 30) — going over never reads as a warning. */
export function MacroCard({ id, label, icon, currentG, targetG, color }: MacroCardProps) {
  const ratio = targetG > 0 ? currentG / targetG : 0;
  const remaining = Math.max(0, Math.round(targetG - currentG));
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const hit = targetG > 0 && currentG >= targetG;

  return (
    <View className="flex-1 gap-2.5 rounded-3xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <IconBadge icon={hit ? "checkmark-circle" : icon} color={color} size={32} />
        <Text className="caption font-body-bold text-text-secondary">{percent}%</Text>
      </View>

      <View className="gap-0">
        <SkewedStat id={`${id}.current`} size={28} color={colors.neutral.textPrimary}>
          {`${Math.round(currentG)}g`}
        </SkewedStat>
        <Text className="caption text-text-secondary">{`of ${Math.round(targetG)}g ${label}`}</Text>
      </View>

      <ProgressBar ratio={ratio} color={color} height={6} />

      <Text className="caption font-body-bold" numberOfLines={1} style={{ color }}>
        {hit ? "Goal hit 🔥" : `${remaining}g to go`}
      </Text>
    </View>
  );
}
