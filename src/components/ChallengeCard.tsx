import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { EditableText } from "@/components/EditableText";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import type { ChallengeMetric } from "@/data/challenges";
import { challengeHeroImage } from "@/lib/challenge-visuals";
import { colors, fontFamily } from "@/theme";

type ChallengeCardProps = {
  /** Dev Mode override id prefix (see EditableText) — e.g. "crew.challenges.weekly-volume-2024w12". */
  id: string;
  metric: ChallengeMetric;
  name: string;
  progress: number;
  target: number;
  unit: string;
  timeLabel: string;
  isComplete: boolean;
  xpReward: number;
  /** Only set for crew Battles (custom challenges with a real rival opponent) — whether the crew is currently ahead. */
  battleStatus?: "winning" | "losing";
  isLast: boolean;
  onPress: () => void;
};

/** One challenge — the flowing-list row shape the rest of Crew uses, not a boxed card: a plain hero
 * image (no `ChromaFrame` ring — removed app-wide) in place of the old accent-bar-plus-banner,
 * `AnimatedProgressBar` for the fill, `HOME_EYEBROW`/`HOME_ROW_TITLE`/`HOME_ROW_DETAIL` for every
 * piece of text so it reads as one thing with the rest of the app rather than its own bordered widget. */
export function ChallengeCard({
  id,
  metric,
  name,
  progress,
  target,
  unit,
  timeLabel,
  isComplete,
  xpReward,
  battleStatus,
  isLast,
  onPress,
}: ChallengeCardProps) {
  const ratio = target > 0 ? progress / target : 0;
  const percent = Math.min(100, Math.round(ratio * 100));
  const accent = isComplete ? colors.semantic.success : colors.brand.yellow;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className={`gap-3 py-3.5 ${isLast ? "" : "border-b border-divider"}`}
    >
      <View className="flex-row items-center gap-3">
        <Image source={challengeHeroImage(metric)} resizeMode="cover" style={{ width: 52, height: 52, borderRadius: 26 }} />

        <View className="flex-1 gap-0.5">
          <Text style={HOME_EYEBROW}>CREW CHALLENGE</Text>
          <EditableText id={`${id}.name`} style={[HOME_ROW_TITLE, { fontSize: 17, lineHeight: 19 }]} numberOfLines={1}>
            {name.toUpperCase()}
          </EditableText>
        </View>

        {isComplete ? (
          <View className="flex-row items-center gap-1 rounded-full bg-success px-2 py-0.5">
            <Ionicons name="checkmark" size={11} color={colors.brand.iron} />
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 10, color: colors.brand.iron }}>DONE</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 18, color: colors.brand.yellow }}>{`${percent}%`}</Text>
        )}
      </View>

      <AnimatedProgressBar progress={ratio} height={6} borderRadius={3} progressColor={accent} trackColor={colors.neutral.divider} animationDuration={700} />

      <View className="flex-row items-center justify-between">
        <Text style={HOME_ROW_DETAIL} numberOfLines={1}>
          {`${progress.toLocaleString("en-US")} / ${target.toLocaleString("en-US")} ${unit}`}
        </Text>
        <View className="flex-row items-center gap-3">
          {battleStatus && !isComplete && (
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={battleStatus === "winning" ? "trending-up" : "trending-down"}
                size={11}
                color={battleStatus === "winning" ? colors.semantic.success : colors.semantic.error}
              />
              <Text className="caption font-body-semibold" style={{ color: battleStatus === "winning" ? colors.semantic.success : colors.semantic.error }}>
                {battleStatus === "winning" ? "Ahead" : "Behind"}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1">
            <Ionicons name="flash" size={11} color={colors.brand.yellow} />
            <Text className="caption font-body-semibold text-brand-yellow">{`+${xpReward.toLocaleString("en-US")} XP`}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name={isComplete ? "trophy" : "flame"} size={12} color={isComplete ? colors.semantic.success : colors.semantic.streak} />
            <Text style={HOME_ROW_DETAIL}>{timeLabel}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
