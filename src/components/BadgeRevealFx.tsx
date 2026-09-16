import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Image, Platform, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { PIConfetti } from "react-native-fast-confetti";
import Svg, { Line } from "react-native-svg";

import { rankTierImages } from "@/constants/images";
import { darken, lighten } from "@/lib/color";
import { RANK_TIER_COLOR, type RankTier } from "@/lib/rank";
import { colors } from "@/theme";

const MEDAL_ASPECT_RATIO = 199 / 241;

// Choreography: a charge-up beat builds tension first (medal stays hidden), then the sunburst +
// medal pop together, the medal lands and triggers the impact ring + confetti pop, and the
// sparkles settle on top last. Every delay below is measured from t=0.
const CHARGE_DURATION = 650;
const MEDAL_FLIP_DELAY = CHARGE_DURATION + 30;
const MEDAL_FLIP_DURATION = 420;
const IMPACT_DELAY = MEDAL_FLIP_DELAY + MEDAL_FLIP_DURATION - 60;

/** Two building pulses right before the medal appears — the "something's about to happen" beat
 * that gives the reveal room to feel earned instead of instant. Re-fires with `triggerKey`. */
function AnticipationPulse({ tint, size }: { tint: string; size: number }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(0.75, { duration: 240, easing: Easing.out(Easing.quad) }),
      withTiming(0.55, { duration: 160, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }),
    );
    opacity.value = withSequence(
      withTiming(0.4, { duration: 220 }),
      withTiming(0.12, { duration: 180 }),
      withTiming(0.7, { duration: 200 }),
      withTiming(0, { duration: 180 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: tint }, style]}
    />
  );
}

/** A one-shot radiating sunburst behind the medal — scales up, rotates slightly, and fades as the
 * medal lands. The backdrop "something is arriving" beat. */
function Sunburst({ tint, size }: { tint: string; size: number }) {
  const scale = useSharedValue(0.4);
  const spin = useSharedValue(-12);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(CHARGE_DURATION, withTiming(1.08, { duration: 750, easing: Easing.out(Easing.cubic) }));
    spin.value = withDelay(CHARGE_DURATION, withTiming(18, { duration: 950, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(
      CHARGE_DURATION,
      withSequence(withTiming(0.6, { duration: 180 }), withDelay(280, withTiming(0, { duration: 480 }))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }] }));

  const rayCount = 10;
  const center = size / 2;
  const rayLength = size / 2;

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {Array.from({ length: rayCount }).map((_, i) => {
          const angle = ((360 / rayCount) * i * Math.PI) / 180;
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * rayLength}
              y2={center + Math.sin(angle) * rayLength}
              stroke={tint}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

/** A one-shot expanding, fading ring — the "impact" beat as the medal lands. Re-fires whenever
 * `triggerKey` changes. */
function ShockwaveRing({ triggerKey, size }: { triggerKey: string; size: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.5;
    opacity.value = 0;
    // Stays invisible through the charge-up (so it doesn't compete with `AnticipationPulse`),
    // then snaps in right as the medal lands and bursts outward.
    opacity.value = withDelay(IMPACT_DELAY, withSequence(withTiming(0.8, { duration: 1 }), withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) })));
    scale.value = withDelay(IMPACT_DELAY, withTiming(1.7, { duration: 650, easing: Easing.out(Easing.cubic) }));
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

/** The medal itself, turning to face the viewer as it pops in — a coin-flip swoosh (rotateY +
 * spring scale) instead of a flat zoom-in. */
function MedalFlipIn({ tier, size, medalHeight }: { tier: RankTier; size: number; medalHeight: number }) {
  const rotateY = useSharedValue(75);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(MEDAL_FLIP_DELAY, withTiming(1, { duration: 150 }));
    rotateY.value = withDelay(MEDAL_FLIP_DELAY, withTiming(0, { duration: MEDAL_FLIP_DURATION, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(MEDAL_FLIP_DELAY, withSpring(1, { damping: 9, mass: 0.8 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 800 }, { rotateY: `${rotateY.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Image source={rankTierImages[tier]} resizeMode="contain" style={{ width: size, height: medalHeight }} />
    </Animated.View>
  );
}

/** The confetti pop as the medal lands — a GPU-accelerated Skia burst (`react-native-fast-confetti`)
 * radiating from the medal's center, tinted to the tier color. Re-fires (fresh random physics)
 * whenever `triggerKey` changes, thanks to the `key` the parent puts on this component.
 * Native only: Skia's web build needs its own async CanvasKit/wasm load step we haven't wired up,
 * and GymCrew's web build is a real, shipped PWA — better to skip confetti there than crash it. */
function ConfettiBurst({ tint, size }: { tint: string; size: number }) {
  if (Platform.OS === "web") return null;

  const palette = [tint, lighten(tint, 0.4), darken(tint, 0.15), colors.neutral.textPrimary];

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: size, height: size }}>
      <PIConfetti autoplay autoStartDelay={IMPACT_DELAY} gravity={2.6} containerStyle={{ width: size, height: size }}>
        <PIConfetti.Origin blastPosition="center" count={28} initialSpeed={1.1} colors={palette}>
          <PIConfetti.Flake size={7} radius={2} />
        </PIConfetti.Origin>
      </PIConfetti>
    </View>
  );
}

const SPARKLE_SPOTS: { style: object; offset: number }[] = [
  { style: { top: -6, left: -18 }, offset: 100 },
  { style: { top: 4, right: -22 }, offset: 170 },
  { style: { bottom: 6, left: -8 }, offset: 240 },
  { style: { bottom: -4, right: 4 }, offset: 200 },
];

function Sparkles() {
  return (
    <>
      {SPARKLE_SPOTS.map((spot, i) => (
        <Animated.View
          key={i}
          entering={ZoomIn.delay(IMPACT_DELAY + spot.offset).duration(280).springify().damping(9)}
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
  /** Re-fires the whole reveal (sunburst, flip, impact ring, confetti, sparkles) when this
   * changes — pass something that changes per reveal (e.g. an exercise id or a reveal counter). */
  triggerKey: string;
  /** Medal width — height follows the medal artwork's own aspect ratio. Defaults to the size used
   * on the PR celebration screen. */
  size?: number;
};

/** The full "rank/PR reveal" effect: a building charge-up pulse, a sunburst backdrop, the medal
 * turning to face the viewer as it pops in, an impact ring + confetti burst as it lands, and
 * sparkles settling on top. The flat yellow glow that used to live here is gone — every screen
 * that renders this now sits on a `TierGradientBackground` tinted to the actual tier color, which
 * does that job better (and correctly, per-tier) than a fixed-color glow behind just the medal
 * could. Shared by the PR celebration screen, the PR share card, and the "What's my rank?" tool so
 * all three get the same payoff. */
export function BadgeRevealFx({ tier, triggerKey, size = 180 }: BadgeRevealFxProps) {
  const medalHeight = size / MEDAL_ASPECT_RATIO;
  const ringSize = size * 1.15;
  const tint = RANK_TIER_COLOR[tier];

  // A tick-tick-THUNK haptic rhythm matched to the two `AnticipationPulse` beats and the final
  // impact — reinforces the build-up instead of just the payoff.
  useEffect(() => {
    const timers = [
      setTimeout(() => Haptics.selectionAsync(), 220),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 520),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), IMPACT_DELAY),
    ];
    return () => timers.forEach(clearTimeout);
  }, [triggerKey]);

  return (
    <View className="items-center justify-center" style={{ width: size, height: medalHeight }}>
      <AnticipationPulse key={`charge-${triggerKey}`} tint={tint} size={ringSize * 0.7} />
      <Sunburst key={`sunburst-${triggerKey}`} tint={tint} size={ringSize * 1.4} />
      <ShockwaveRing key={`ring-${triggerKey}`} triggerKey={triggerKey} size={ringSize} />
      <ConfettiBurst key={`confetti-${triggerKey}`} tint={tint} size={size * 1.8} />
      <MedalFlipIn key={`medal-${triggerKey}`} tier={tier} size={size} medalHeight={medalHeight} />
      <Sparkles key={`sparkles-${triggerKey}`} />
    </View>
  );
}
