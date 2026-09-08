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

/** One macro's card on the Nutrition dashboard — accent-bar card language (see ChallengeCard),
 * icon badge, a big skewed stat number, and a gamified "Xg to go" line instead of a flat
 * "Remaining: X" (see NUTRITION.md section 2). Hitting the target flips the line to a small
 * celebratory note rather than just stopping at 0, matching the app's "motivation, not shame" rule
 * for nutrition (section 30) — going over never reads as a warning. */
export function MacroCard({ id, label, icon, currentG, targetG, color }: MacroCardProps) {
  const ratio = targetG > 0 ? currentG / targetG : 0;
  const remaining = Math.max(0, Math.round(targetG - currentG));
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const hit = targetG > 0 && currentG >= targetG;

  return (
    <View className="flex-1 flex-row overflow-hidden rounded-2xl border border-divider bg-surface">
      <View style={{ width: 4, backgroundColor: color }} />
      <View className="flex-1 gap-2 p-3">
        <View className="flex-row items-center justify-between">
          <IconBadge icon={icon} color={color} size={28} />
          {hit ? (
            <View className="flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: color }}>
              <Ionicons name="checkmark" size={9} color={colors.brand.iron} />
              <Text className="caption font-body-bold text-brand-iron">DONE</Text>
            </View>
          ) : (
            <Text className="caption font-body-bold" style={{ color }}>
              {percent}%
            </Text>
          )}
        </View>

        <View className="gap-0">
          <SkewedStat id={`${id}.current`} size={26} color={colors.neutral.textPrimary}>
            {`${Math.round(currentG)}g`}
          </SkewedStat>
          <Text className="caption text-text-secondary">{`of ${Math.round(targetG)}g ${label}`}</Text>
        </View>

        <ProgressBar ratio={ratio} color={color} height={6} />

        <Text className="caption font-body-semibold" numberOfLines={1} style={{ color: hit ? color : colors.neutral.textSecondary }}>
          {hit ? "Goal hit 🔥" : `${remaining}g to go`}
        </Text>
      </View>
    </View>
  );
}
