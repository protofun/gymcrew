import { Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import type { Achievement } from "@/lib/member-mock-profile";
import type { RankTier } from "@/lib/rank";
import { formatShortAgo } from "@/lib/time-since";
import { formatWeight } from "@/lib/units";

export function AchievementRow({ achievement, tier }: { achievement: Achievement; tier: RankTier }) {
  // Always the viewer's own display preference, whether this achievement is mine or a crewmate's —
  // the unit toggle is a personal setting, not something that varies by whose PR is on screen.
  const weightUnit = useWeightUnit();

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
        <RankBadge tier={tier} size={30} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary">{achievement.exerciseName} PR</Text>
        <Text className="caption text-text-secondary">
          {formatWeight(achievement.weightKg, weightUnit)} × {achievement.reps} reps
        </Text>
      </View>

      <Text className="caption text-text-secondary">{formatShortAgo(achievement.achievedAt)}</Text>
    </View>
  );
}
