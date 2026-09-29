import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { BadgeRevealFx } from "@/components/BadgeRevealFx";
import { RankBadge } from "@/components/RankBadge";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankTier } from "@/lib/rank";
import { colors, fontFamily } from "@/theme";

// How many tiers below the achieved one the climb starts from — clamped at 0 (Rookie), so a low
// tier just gets a shorter, still-real climb instead of an out-of-range one.
const SPIN_TIERS = 6;
const SPIN_START_DELAY = 90;
// >1 deliberately: each step waits longer than the last, so the climb starts fast (several tiers a
// second) and audibly/visually slows into the landing — "neem hier de tijd voor zodat het spannend
// is maar maak het niet saai... het moet hyper overkomen": the deceleration curve IS the suspense.
const SPIN_DELAY_GROWTH = 1.38;

const REEL_HEIGHT = 420;
// Tall enough for `BadgeRevealFx`'s own medal artwork (84px wide badge renders ~102px tall at its
// real aspect ratio, not square like `RankBadge`) plus its label underneath, so the active row
// doesn't visually crowd once it swaps from a plain badge to the full reveal at landing.
const REEL_ROW_HEIGHT = 132;
const REEL_BADGE_SIZE = 84;
const reelLabelStyle = { fontFamily: fontFamily.heading, fontSize: 15, letterSpacing: 0.8 };
const REEL_ROW_TOP = (REEL_HEIGHT - REEL_ROW_HEIGHT) / 2;

/** One row of the straight vertical rank reel — translateY only, no curve, no rotation, no
 * horizontal shift ("het moet geen arc fan worden, het moet gewoon verticaal recht bewegen"; the
 * earlier `arc-list`-based wheel curved and tilted each row as it left center, which read as a fan,
 * not the plain up/down motion asked for). `centerIndex` is a shared value the climb drives with
 * `withTiming` — every row computes its own offset from it, so the whole reel moves as one
 * continuous straight glide instead of each row re-rendering on every step. */
function ReelRow({
  index,
  centerIndex,
  itemTier,
  isActive,
  phase,
  triggerKey,
  label,
}: {
  index: number;
  centerIndex: SharedValue<number>;
  itemTier: RankTier;
  isActive: boolean;
  phase: "climbing" | "landed";
  triggerKey: string;
  label: string;
}) {
  const rowStyle = useAnimatedStyle(() => {
    const offset = index - centerIndex.value;
    const distance = Math.abs(offset);
    return {
      transform: [
        { translateY: offset * REEL_ROW_HEIGHT },
        { scale: interpolate(distance, [0, 1, 2, 3], [1, 0.86, 0.72, 0.6], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(distance, [0, 1, 2, 3], [1, 0.55, 0.28, 0], Extrapolation.CLAMP),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const t = interpolate(Math.abs(index - centerIndex.value), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { color: interpolateColor(t, [0, 1], [colors.neutral.textSecondary, RANK_TIER_COLOR[itemTier]]) };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top: REEL_ROW_TOP, left: 0, right: 0, height: REEL_ROW_HEIGHT, alignItems: "center", justifyContent: "center" }, rowStyle]}
    >
      <View className="items-center gap-1.5">
        {isActive && phase === "landed" ? (
          <BadgeRevealFx tier={itemTier} triggerKey={triggerKey} size={REEL_BADGE_SIZE} />
        ) : (
          <RankBadge tier={itemTier} size={REEL_BADGE_SIZE} />
        )}
        <Animated.Text style={[reelLabelStyle, labelStyle]}>{label}</Animated.Text>
      </View>
    </Animated.View>
  );
}

/** The `topPercent` stat as a small ring instead of a flat pill — "veel reacticx componenten": a
 * second `CircularProgress` alongside `BadgeRevealFx`'s own, filling to how close to the top the lift
 * actually is (`100 - topPercent`, since "top 5%" should read as a nearly-full ring, not a nearly-
 * empty one). */
function TopPercentRing({ topPercent, tint }: { topPercent: number; tint: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, 100 - topPercent), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [topPercent, progress]);

  return (
    <View className="items-center">
      <CircularProgress
        progress={progress}
        size={64}
        strokeWidth={5}
        gap={3}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={tint}
        backgroundColor={colors.neutral.surfaceElevated}
        renderIcon={() => (
          <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.brand.white }}>{`${topPercent}%`}</Text>
        )}
      />
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 0.6, color: colors.neutral.textSecondary, marginTop: 4 }}>TOP %</Text>
    </View>
  );
}

/** Progress to the next tier, also a ring — mirrors `TopPercentRing`'s shape instead of inventing a
 * third way (a linear bar) to show a percentage next to two rings. */
function NextTierRing({ ratio, tint }: { ratio: number; tint: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, ratio * 100)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  return (
    <View className="items-center">
      <CircularProgress
        progress={progress}
        size={64}
        strokeWidth={5}
        gap={3}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={tint}
        backgroundColor={colors.neutral.surfaceElevated}
        renderIcon={() => <Ionicons name="arrow-up" size={20} color={colors.brand.white} />}
      />
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 0.6, color: colors.neutral.textSecondary, marginTop: 4 }}>NEXT TIER</Text>
    </View>
  );
}

type RankUpRevealProps = {
  tier: RankTier;
  exerciseName: string;
  /** The exercise's own photo — shown bigger and clearer in the header now ("de oefening moet
   * duidelijker in beeld komen"). Falls back to a plain barbell glyph when an exercise (e.g. a
   * custom one) has none. */
  exerciseImageUrl?: string | null;
  weightKg: number;
  reps: number;
  unit: string;
  topPercent: number | null;
  progressToNextTier: number | null;
  /** Re-fires the whole climb + reel + medal reveal when this changes. */
  triggerKey: string;
  headerRight?: ReactNode;
  /** A back/close affordance in the header's top-left — omitted on `pr-celebration.tsx` (there's
   * nothing to go back to mid-celebration but the summary it already leads to via the footer), used
   * by `whats-my-rank.tsx`'s `RevealStep` now that it's its own full-screen takeover instead of a
   * step sharing the wizard's own header bar. */
  onBack?: () => void;
  /** Screen-specific actions below the stat row — pagination dots + Next on the PR-celebration
   * screen, Log as PR / View Only on the What's My Rank wizard. This component owns the reveal
   * itself, never what happens after it. Rendered OUTSIDE `shareRef`'s capture (see below) — a
   * shared screenshot should show the reveal, not "Next"/"Log as PR" buttons. */
  footer: ReactNode;
  /** Wraps the reveal content only (header, reel, stat rings) — not `footer` — so a
   * `captureRef(shareRef, ...)` screenshot from the caller gets exactly the celebratory image. */
  shareRef?: RefObject<View | null>;
};

/** The full "you ranked up on a lift" moment. Round 22: the climb is a straight vertical reel, not
 * a curved wheel — "het moet geen arc fan worden, het moet gewoon verticaal recht bewegen." A
 * previous version drove a Reacticx `arc-list` (built for a rolodex-style curved/tilted wheel, the
 * same mechanism as a weight/reps picker), which is a fan by construction — every row tilts and
 * shifts sideways as it leaves center. That's the wrong shape for this: `ReelRow` above moves each
 * tier on `translateY` alone, driven by one shared value (`centerIndex`) the climb animates with
 * `withTiming` — a plain, continuous straight glide, still centered with the tier just below sitting
 * above it and the tier just above sitting below it. The climb pacing itself (a `setTimeout` chain
 * with a growing delay each step — fast start, slow landing, "neem hier de tijd voor... het moet
 * hyper overkomen") is unchanged from round 18/20. Only once it LANDS does the active row's badge
 * become `BadgeRevealFx` (charge-up, sunburst, flip, confetti, shine) — every other row, climbing or
 * settled, is a plain badge. */
export function RankUpReveal({ tier, exerciseName, exerciseImageUrl, weightKg, reps, unit, topPercent, progressToNextTier, triggerKey, headerRight, onBack, footer, shareRef }: RankUpRevealProps) {
  const tierIndex = RANK_TIERS.indexOf(tier);
  const nextTier = tierIndex < RANK_TIERS.length - 1 ? RANK_TIERS[tierIndex + 1] : null;
  const tint = RANK_TIER_COLOR[tier];

  const [phase, setPhase] = useState<"climbing" | "landed">("climbing");
  const centerIndex = useSharedValue(Math.max(0, tierIndex - SPIN_TIERS));

  useEffect(() => {
    const startIndex = Math.max(0, tierIndex - SPIN_TIERS);
    setPhase("climbing");
    centerIndex.value = startIndex;

    let current = startIndex;
    let delay = SPIN_START_DELAY;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function step() {
      if (current >= tierIndex) {
        setPhase("landed");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      current += 1;
      delay *= SPIN_DELAY_GROWTH;
      centerIndex.value = withTiming(current, { duration: delay, easing: Easing.out(Easing.quad) });
      Haptics.selectionAsync();
      timeouts.push(setTimeout(step, delay));
    }
    // Already at the bottom of the ladder (Rookie) — nothing to climb, land immediately.
    if (startIndex >= tierIndex) {
      setPhase("landed");
    } else {
      step();
    }

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.neutral.background }}>
      <View className="flex-1 gap-4 px-4 pt-2">
        <View ref={shareRef} collapsable={false} className="flex-1 gap-5">
          <View className="flex-row items-center gap-3" style={{ minHeight: 24 }}>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={8}>
                <Ionicons name="chevron-back" size={20} color={colors.brand.white} />
              </Pressable>
            )}
            <Animated.View entering={FadeIn.duration(300)} className="flex-1 flex-row items-center gap-3">
              {exerciseImageUrl ? (
                <Image source={{ uri: exerciseImageUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />
              ) : (
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
                  <Ionicons name="barbell-outline" size={22} color={colors.neutral.textSecondary} />
                </View>
              )}
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 24, color: colors.brand.white, flexShrink: 1 }} numberOfLines={2}>
                {exerciseName}
              </Text>
            </Animated.View>
            {headerRight}
          </View>

          <View className="flex-1 items-center justify-center">
            <View style={{ height: REEL_HEIGHT, width: 260, overflow: "hidden" }}>
              {RANK_TIERS.map((itemTier, index) => (
                <ReelRow
                  key={itemTier}
                  index={index}
                  centerIndex={centerIndex}
                  itemTier={itemTier}
                  isActive={index === tierIndex}
                  phase={phase}
                  triggerKey={triggerKey}
                  label={phase === "landed" && index === tierIndex + 1 ? `NEXT: ${formatRankTier(itemTier).toUpperCase()}` : formatRankTier(itemTier).toUpperCase()}
                />
              ))}
            </View>
          </View>

          {/* The stat row — two rings flanking the weight×reps number, only once landed. Still
              inside `shareRef`'s capture, just above `footer`, which isn't. */}
          {phase === "landed" && (
            <Animated.View entering={FadeInUp.delay(200).duration(350)} className="flex-row items-center justify-center gap-6 pb-2">
              {progressToNextTier != null && nextTier ? <NextTierRing ratio={progressToNextTier} tint={tint} /> : <View style={{ width: 64 }} />}

              <View className="items-center gap-0.5">
                <View className="flex-row items-baseline gap-1.5">
                  <NumberFlow value={weightKg} fontSize={30} color={colors.brand.white} fontWeight="800" />
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.neutral.textSecondary }}>{unit}</Text>
                </View>
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>{`× ${reps} ${reps === 1 ? "rep" : "reps"}`}</Text>
              </View>

              {topPercent != null ? <TopPercentRing topPercent={topPercent} tint={tint} /> : <View style={{ width: 64 }} />}
            </Animated.View>
          )}
        </View>

        {phase === "landed" && footer}
      </View>
    </View>
  );
}
