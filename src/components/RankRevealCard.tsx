import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { BadgeRevealFx } from "@/components/BadgeRevealFx";
import { EditableText } from "@/components/EditableText";
import { ProgressBar } from "@/components/ProgressBar";
import { formatRankTier, RANK_TIER_COLOR, type RankTier } from "@/lib/rank";
import { fontFamily } from "@/theme";

const MEDAL_SIZE = 170;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className — see TopBar's wordmarkStyle for the same constraint.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

const tierNameStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 38,
  lineHeight: 40,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const exerciseNameStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 24,
  lineHeight: 26,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const metricPillTextStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "8deg" }],
};

type RankRevealCardProps = {
  /** Dev Mode override id prefix (see EditableText) — e.g. "workout.prCelebration". */
  id: string;
  name: string;
  tier: RankTier;
  weightKg: number;
  reps: number;
  unit: string;
  /** "Top X% for your bodyweight" pill + the progress bar at the bottom — both omitted together
   * when there's nothing to show (e.g. no bodyweight/gender on file yet). */
  topPercent?: number | null;
  progressToNextTier?: number | null;
  /** Re-fires the medal's reveal animation when this changes — see `BadgeRevealFx`. */
  triggerKey: string;
  /** Right side of the header row — e.g. info/share icon buttons. Defaults to nothing (just the
   * wordmark, centered by the flex row's own justify-between). */
  headerRight?: ReactNode;
};

/** The one "you hit a rank/PR" card — exercise name, medal reveal, tier, and the lift itself, all
 * on a flat `bg-surface` card (deliberately not a colored/gradient background: this is the
 * canonical version, first built for "What's my rank?", and every other place that shows a medal
 * reveal (the PR celebration screen, the "share this PR" card) should look exactly like this one,
 * not its own slightly-different take). */
export function RankRevealCard({ id, name, tier, weightKg, reps, unit, topPercent, progressToNextTier, triggerKey, headerRight }: RankRevealCardProps) {
  const tint = RANK_TIER_COLOR[tier];

  return (
    <View className="w-full items-center gap-4 rounded-3xl border border-divider bg-surface p-5">
      <View className="w-full flex-row items-center justify-between">
        <Text style={wordmarkStyle}>
          <Text className="text-text-primary">GYM</Text>
          <Text className="text-brand-yellow">CREW</Text>
        </Text>
        {headerRight}
      </View>

      {/* No `numberOfLines` here — same reason as the tier name below: on web it compiles to
          `overflow: hidden` sized to the pre-skew box, which clips the tail of this skewed text
          (e.g. "Seated Row" rendering as "Seated Ro") even when the name would've fit on one line
          fine unskewed. A long exercise name just wraps to a second line instead, which this
          centered column layout handles fine — better than silently truncating a real name. */}
      <EditableText id={`${id}.name`} style={exerciseNameStyle} className="text-center text-text-primary">
        {name}
      </EditableText>

      <BadgeRevealFx tier={tier} triggerKey={triggerKey} size={MEDAL_SIZE} />

      <View className="items-center gap-1.5">
        {/* No `numberOfLines` here — on web that compiles to `overflow: hidden` on the text node,
            which clips the tail of the glyph run this skewed style paints (e.g. "TITAN" losing
            half its "N"), since the transform is applied after RN measures the pre-skew box. Every
            tier name is a single word, so there's no wrapping risk to guard against anyway. */}
        <EditableText id={`${id}.tier`} style={[tierNameStyle, { color: tint }]}>
          {formatRankTier(tier).toUpperCase()}
        </EditableText>
        {topPercent != null && (
          <View className="flex-row items-center gap-1.5 rounded-full border px-3 py-1" style={{ borderColor: tint }}>
            <Ionicons name="flame" size={12} color={tint} />
            <EditableText id={`${id}.topPercent`} className="caption font-body-semibold" style={{ color: tint }}>
              {`Top ${topPercent}% for your bodyweight`}
            </EditableText>
          </View>
        )}
      </View>

      <View style={{ transform: [{ skewX: "-8deg" }] }} className="border border-divider bg-background px-6 py-2.5">
        <EditableText id={`${id}.metric`} style={metricPillTextStyle} className="text-text-primary">
          {`${weightKg}${unit} × ${reps} ${reps === 1 ? "rep" : "reps"}`}
        </EditableText>
      </View>

      {progressToNextTier != null && (
        <View className="w-full">
          <ProgressBar ratio={progressToNextTier} color={tint} height={6} />
        </View>
      )}
    </View>
  );
}
