import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { RankBadge } from "@/components/RankBadge";
import type { MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIER_COLOR, type RankTier } from "@/lib/rank";
import { colors, fontFamily } from "@/theme";

const rowTitleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

type MuscleRankRowProps = {
  group: MuscleGroup;
  /** `null` for "not ranked/assigned yet" — shows the dashed placeholder badge and `unrankedLabel`. */
  tier: RankTier | null;
  index: number;
  onPress: () => void;
  unrankedLabel?: string;
};

/** One row of the "muscle group → rank" list shown below a body graph — shared by the real Muscle
 * Rank screen (`ranks/body-graph.tsx`, computed from real lift data) and the Dev Mode "Build Your
 * Own Graph" sandbox (`ranks/build-your-graph.tsx`, manually assigned), so both present the exact
 * same badge/accent-bar/label look. */
export function MuscleRankRow({ group, tier, index, onPress, unrankedLabel = "No data yet" }: MuscleRankRowProps) {
  const accent = tier ? RANK_TIER_COLOR[tier] : colors.neutral.divider;

  return (
    <Animated.View entering={FadeInUp.delay(180 + index * 50).springify().damping(16).mass(0.6)}>
      <Pressable
        onPress={onPress}
        style={PRESSED_STYLE}
        className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface"
      >
        <View style={{ width: 4, backgroundColor: accent }} />

        <View className="flex-1 flex-row items-center gap-3 p-3">
          {tier ? (
            <RankBadge tier={tier} size={40} />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full border border-dashed border-divider">
              <Ionicons name="help" size={16} color={colors.neutral.textSecondary} />
            </View>
          )}

          <View className="flex-1 gap-0.5">
            <Text style={rowTitleStyle} className="text-text-primary">
              {formatMuscleLabel(group).toUpperCase()}
            </Text>
            {tier ? (
              <Text className="caption font-body-bold" style={{ color: accent }}>
                {formatRankTier(tier).toUpperCase()}
              </Text>
            ) : (
              <Text className="caption font-body-semibold text-text-secondary">{unrankedLabel}</Text>
            )}
          </View>
        </View>

        <View className="items-center justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
