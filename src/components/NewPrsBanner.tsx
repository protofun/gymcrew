import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { TierGradientBackground } from "@/components/TierGradientBackground";
import { RANK_TIER_COLOR, type RankTier } from "@/lib/rank";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see ChallengeCard.tsx's `titleStyle` for the same constraint
// (this banner deliberately mirrors that card's accent-bar/skewed-title language, not a generic box).
const titleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 22,
  lineHeight: 24,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

type NewPrsBannerProps = {
  count: number;
  topTier: RankTier;
  exerciseNames: string[];
  xpEarned: number;
};

/** The "you just hit N PRs" moment on the results screen — same accent-bar-card language as
 * `ChallengeCard` (crew Challenges tab) rather than a generic bordered box with an emoji, so it
 * reads as part of the app's established achievement UI instead of a one-off. */
export function NewPrsBanner({ count, topTier, exerciseNames, xpEarned }: NewPrsBannerProps) {
  const tint = RANK_TIER_COLOR[topTier];

  return (
    <TierGradientBackground color={tint}>
      <View className="flex-row items-stretch">
        <View style={{ width: 4, backgroundColor: tint }} />

        <View className="items-center justify-center pl-3 pr-1">
          <RankBadge tier={topTier} size={52} />
        </View>

        <View className="flex-1 gap-1 py-3 pl-2 pr-3">
          <Text style={titleStyle} className="text-text-primary">
            {count} NEW PR{count > 1 ? "'S" : ""}
          </Text>
          {/* text-primary (white), not the usual secondary gray — this sits directly on the
              tier-color gradient, where gray reads as low-contrast/hard to read (see WorkoutShareCard
              for the same fix). */}
          <Text className="body-sm text-text-primary" numberOfLines={1}>
            {exerciseNames.join(" · ")}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="flash" size={11} color={colors.brand.yellow} />
            <Text className="caption font-body-semibold text-brand-yellow">+{xpEarned} XP earned</Text>
          </View>
        </View>
      </View>
    </TierGradientBackground>
  );
}
