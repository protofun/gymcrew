import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { PIConfetti } from "react-native-fast-confetti";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { DivisionBadge } from "@/components/DivisionBadge";
import { darken, lighten } from "@/lib/color";
import { DIVISION_COLOR, type Division } from "@/lib/division";
import { fontFamily } from "@/theme";

/** Fires alongside `CelebrationRing`'s own impact beat below. */
const CONFETTI_IMPACT_DELAY = 300;

const BADGE_SIZE = 140;
const GLOW_SIZE = BADGE_SIZE * 2.1;
const RING_SIZE = BADGE_SIZE * 1.3;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const titleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 34,
  lineHeight: 36,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

/** A slow, continuous pulsing radial glow behind the badge — mirrors the PR-celebration screen's
 * MedalGlow, but colored per-division instead of always brand yellow. */
function CelebrationGlow({ color }: { color: string }) {
  const pulse = useSharedValue(0.92);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute" }, style]}>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
        <Defs>
          <RadialGradient id="divisionCelebrationGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <Stop offset="60%" stopColor={color} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#divisionCelebrationGlow)" />
      </Svg>
    </Animated.View>
  );
}

/** A one-shot expanding, fading ring — the "impact" beat as the badge lands. */
function CelebrationRing({ triggerKey, color }: { triggerKey: string; color: string }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.5;
    opacity.value = 0.8;
    scale.value = withDelay(300, withTiming(1.7, { duration: 650, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(300, withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2, borderColor: color }, style]}
    />
  );
}

/** The confetti pop as the badge lands — same Skia burst `BadgeRevealFx` uses, tinted to the
 * division color. Native only: Skia's web build needs its own CanvasKit/wasm load step this app
 * hasn't wired up, and this overlay also renders on GymCrew's shipped web/PWA build. */
function CelebrationConfetti({ color, size }: { color: string; size: number }) {
  if (Platform.OS === "web") return null;

  const palette = [color, lighten(color, 0.4), darken(color, 0.15)];

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: size, height: size }}>
      <PIConfetti autoplay autoStartDelay={CONFETTI_IMPACT_DELAY} gravity={2.6} containerStyle={{ width: size, height: size }}>
        <PIConfetti.Origin blastPosition="center" count={28} initialSpeed={1.1} colors={palette}>
          <PIConfetti.Flake size={7} radius={2} />
        </PIConfetti.Origin>
      </PIConfetti>
    </View>
  );
}

const SPARKLE_SPOTS: { style: object; delay: number }[] = [
  { style: { top: -4, left: -20 }, delay: 500 },
  { style: { top: 8, right: -24 }, delay: 570 },
  { style: { bottom: 10, left: -10 }, delay: 640 },
  { style: { bottom: -6, right: 2 }, delay: 600 },
];

function Sparkles({ color }: { color: string }) {
  return (
    <>
      {SPARKLE_SPOTS.map((spot, i) => (
        <Animated.View
          key={i}
          entering={ZoomIn.delay(spot.delay).duration(280).springify().damping(9)}
          style={[{ position: "absolute" }, spot.style]}
        >
          <Ionicons name="sparkles" size={16} color={color} />
        </Animated.View>
      ))}
    </>
  );
}

type DivisionUpOverlayProps = {
  visible: boolean;
  subjectLabel: string;
  from: Division;
  to: Division;
  onDismiss: () => void;
};

export function DivisionUpOverlay({ visible, subjectLabel, from, to, onDismiss }: DivisionUpOverlayProps) {
  const color = DIVISION_COLOR[to];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }} className="items-center justify-center px-8">
        <Animated.View entering={FadeIn.delay(80).duration(350)} className="items-center gap-1.5">
          <Ionicons name="trending-up" size={16} color={color} />
          <Text className="body-md font-body-bold" style={{ color, letterSpacing: 2 }}>
            DIVISION UP
          </Text>
        </Animated.View>

        <View className="items-center justify-center" style={{ width: BADGE_SIZE, height: BADGE_SIZE, marginTop: 20 }}>
          <CelebrationGlow key={`glow-${to}`} color={color} />
          <CelebrationRing triggerKey={to} color={color} />
          <CelebrationConfetti key={`confetti-${to}`} color={color} size={BADGE_SIZE * 1.8} />
          <Animated.View key={`badge-${to}`} entering={ZoomIn.springify().damping(9).mass(0.8).delay(200)}>
            <DivisionBadge division={to} size={BADGE_SIZE} />
          </Animated.View>
          <Sparkles key={`sparkles-${to}`} color={color} />
        </View>

        <Animated.View entering={FadeInUp.delay(500).springify().damping(16)} className="mt-6 items-center gap-2">
          <Text style={titleStyle} className="text-brand-white">
            {to.toUpperCase()}
          </Text>
          <Text className="body-md text-center text-text-secondary">
            {subjectLabel} climbed from {from} to {to}!
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(750).duration(350)} style={{ width: "100%", marginTop: 40 }}>
          <Pressable onPress={onDismiss} className="items-center rounded-full py-4" style={{ backgroundColor: color }}>
            <Text className="body-lg font-body-bold text-brand-iron">Let&apos;s Go</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
