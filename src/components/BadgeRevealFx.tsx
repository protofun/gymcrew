import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from "react-native-reanimated";

import { rankTierImages } from "@/constants/images";
import type { RankTier } from "@/lib/rank";
import { colors } from "@/theme";

const MEDAL_ASPECT_RATIO = 199 / 241;

/** A one-shot expanding, fading ring — the "impact" beat as the medal lands. Re-fires whenever
 * `triggerKey` changes. */
function ShockwaveRing({ triggerKey, size }: { triggerKey: string; size: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.5;
    opacity.value = 0.8;
    scale.value = withDelay(380, withTiming(1.7, { duration: 650, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(380, withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.brand.yellow }, style]}
    />
  );
}

const SPARKLE_SPOTS: { style: object; delay: number }[] = [
  { style: { top: -6, left: -18 }, delay: 560 },
  { style: { top: 4, right: -22 }, delay: 630 },
  { style: { bottom: 6, left: -8 }, delay: 700 },
  { style: { bottom: -4, right: 4 }, delay: 660 },
];

function Sparkles() {
  return (
    <>
      {SPARKLE_SPOTS.map((spot, i) => (
        <Animated.View
          key={i}
          entering={ZoomIn.delay(spot.delay).duration(280).springify().damping(9)}
          style={[{ position: "absolute" }, spot.style]}
        >
          <Ionicons name="sparkles" size={16} color={colors.brand.yellow} />
        </Animated.View>
      ))}
    </>
  );
}

type BadgeRevealFxProps = {
  tier: RankTier;
  /** Re-fires the shockwave + sparkles beat when this changes — pass something that changes per
   * reveal (e.g. an exercise id or a reveal counter). */
  triggerKey: string;
  /** Medal width — height follows the medal artwork's own aspect ratio. Defaults to the size used
   * on the PR celebration screen. */
  size?: number;
};

/** The full "rank/PR reveal" effect — impact ring, sparkles, and the medal itself popping in. The
 * glow that used to live here (a flat yellow radial pulse, regardless of tier) is gone — every
 * screen that renders this now sits on a `TierGradientBackground` tinted to the actual tier color,
 * which does that job better (and correctly, per-tier) than a fixed-color glow behind just the
 * medal could. Shared by the PR celebration screen, the PR share card, and the "What's my rank?"
 * tool so all three get the same payoff. */
export function BadgeRevealFx({ tier, triggerKey, size = 180 }: BadgeRevealFxProps) {
  const medalHeight = size / MEDAL_ASPECT_RATIO;
  const ringSize = size * 1.15;

  return (
    <View className="items-center justify-center" style={{ width: size, height: medalHeight }}>
      <ShockwaveRing key={`ring-${triggerKey}`} triggerKey={triggerKey} size={ringSize} />
      <Animated.View key={`medal-${triggerKey}`} entering={ZoomIn.springify().damping(8).mass(0.8).delay(250)}>
        <Image source={rankTierImages[tier]} resizeMode="contain" style={{ width: size, height: medalHeight }} />
      </Animated.View>
      <Sparkles key={`sparkles-${triggerKey}`} />
    </View>
  );
}
