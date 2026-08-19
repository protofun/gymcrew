import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { ProgressBar } from "@/components/ProgressBar";
import type { ChallengeMetric } from "@/data/challenges";
import { challengeHeroImage } from "@/lib/challenge-visuals";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const titleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

type ChallengeCardProps = {
  metric: ChallengeMetric;
  name: string;
  progress: number;
  target: number;
  unit: string;
  timeLabel: string;
  isComplete: boolean;
  xpReward: number;
  onPress: () => void;
};

export function ChallengeCard({ metric, name, progress, target, unit, timeLabel, isComplete, xpReward, onPress }: ChallengeCardProps) {
  const ratio = target > 0 ? progress / target : 0;
  const percent = Math.min(100, Math.round(ratio * 100));
  const accent = isComplete ? colors.semantic.success : colors.brand.yellow;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className={`flex-row items-stretch overflow-hidden rounded-2xl border ${isComplete ? "border-success" : "border-divider"} bg-surface`}
    >
      <View style={{ width: 4, backgroundColor: accent }} />

      <Image source={challengeHeroImage(metric)} resizeMode="cover" style={{ width: 64, height: 88 }} />

      <View className="flex-1 gap-1.5 p-3">
        <View className="flex-row items-center justify-between">
          <Text style={titleStyle} className="flex-1 text-text-primary" numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
          {isComplete ? (
            <View className="flex-row items-center gap-1 rounded-full bg-success px-2 py-0.5">
              <Ionicons name="checkmark" size={11} color={colors.brand.iron} />
              <Text className="caption font-body-bold text-brand-iron">DONE</Text>
            </View>
          ) : (
            <Text className="body-sm font-body-bold text-brand-yellow">{percent}%</Text>
          )}
        </View>

        <View className="flex-row items-center gap-1">
          <Ionicons name="flash" size={11} color={colors.brand.yellow} />
          <Text className="caption font-body-semibold text-brand-yellow">+{xpReward.toLocaleString("en-US")} XP</Text>
        </View>

        <ProgressBar ratio={ratio} color={accent} height={7} />

        <View className="flex-row items-center justify-between">
          <Text className="caption font-body-semibold text-text-secondary">
            {progress.toLocaleString("en-US")} / {target.toLocaleString("en-US")} {unit}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name={isComplete ? "trophy" : "flame"} size={12} color={isComplete ? colors.semantic.success : colors.semantic.streak} />
            <Text className="caption font-body-semibold text-text-secondary">{timeLabel}</Text>
          </View>
        </View>
      </View>

      <View className="items-center justify-center pr-3">
        <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
      </View>
    </Pressable>
  );
}
