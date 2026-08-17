import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, Share, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { rankTierImages } from "@/constants/images";
import { calculateLiftRank, formatRankTier, majorLiftForExerciseId } from "@/lib/rank";
import { formatTimeSince } from "@/lib/time-since";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const MEDAL_WIDTH = 180;
const MEDAL_ASPECT_RATIO = 199 / 241;
const GLOW_SIZE = MEDAL_WIDTH * 1.9;
const RING_SIZE = MEDAL_WIDTH * 1.15;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native
// when combined with a sibling className — see theme/typography.ts.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 22,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

/** A slow, continuous pulsing radial glow behind the medal so it feels alive, not static. */
function MedalGlow() {
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
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.brand.yellow} stopOpacity={0.45} />
            <Stop offset="60%" stopColor={colors.brand.yellow} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={colors.brand.yellow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#glow)" />
      </Svg>
    </Animated.View>
  );
}

/** A one-shot expanding, fading ring — the "impact" beat as the medal lands. Re-fires whenever
 * `triggerKey` changes (a new PR in the carousel). */
function ShockwaveRing({ triggerKey }: { triggerKey: string }) {
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
      style={[
        {
          position: "absolute",
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderWidth: 2,
          borderColor: colors.brand.yellow,
        },
        style,
      ]}
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

/** Counts up preserving one decimal place (plate-weight PRs are often e.g. 92.5kg — the shared
 * `useCountUp` hook rounds to a whole number, which would land on the wrong final value here). */
function useDecimalCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    function tick() {
      const progress = Math.min((Date.now() - start) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased * 10) / 10);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export default function PrCelebrationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkoutHistoryStore((state) => state.workouts.find((w) => w.id === id));
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const hasPrs = !!workout && workout.prs.length > 0;
  const pr = hasPrs ? workout.prs[index] : null;

  // Only the four major lifts have established strength standards to rank against, and the
  // calculation needs bodyweight + gender from onboarding — anything else falls back to Gold
  // rather than presenting a tier we can't actually justify.
  const majorLift = pr ? majorLiftForExerciseId(pr.exerciseId) : null;
  const canCalculateRank = majorLift !== null && !!onboarding.weightKg && !!onboarding.gender;
  const rankTier =
    canCalculateRank && pr
      ? calculateLiftRank(majorLift!, pr.weightKg, {
          bodyWeightKg: onboarding.weightKg!,
          gender: onboarding.gender!,
          age: onboarding.age,
        })
      : "gold";
  const medalImage = rankTierImages[rankTier];

  // Hooks must run unconditionally on every render, so this runs even while `pr` is briefly null
  // (before the redirect below takes effect) — 0 is a harmless placeholder in that case.
  const animatedWeight = useDecimalCountUp(pr?.weightKg ?? 0);

  if (!workout || !pr) {
    router.replace({ pathname: "/workout/summary", params: { id: id ?? "" } });
    return null;
  }

  const isLast = index === workout.prs.length - 1;
  const percentIncrease =
    pr.previousBestKg && pr.previousBestKg > 0 ? ((pr.weightKg - pr.previousBestKg) / pr.previousBestKg) * 100 : null;
  const timeSince = pr.previousAchievedAt ? formatTimeSince(pr.previousAchievedAt, Date.now()) : null;
  const displayWeight = Number.isInteger(animatedWeight) ? animatedWeight.toString() : animatedWeight.toFixed(1);

  function shareAsText() {
    // Share.share returns a rejected promise on web when the browser has no native share sheet
    // (e.g. non-HTTPS or headless contexts) — .catch() it so that never surfaces as an unhandled
    // rejection (a plain try/catch around the call wouldn't catch an async rejection like this).
    Share.share({
      message: `New PR on ${pr!.exerciseName}: ${pr!.weightKg}${workout!.unit} × ${pr!.reps} reps${
        percentIncrease !== null ? ` (+${percentIncrease.toFixed(1)}%)` : ""
      } on GymCrew! 💪`,
    }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  async function handleShare() {
    if (sharing || !shareCardRef.current) return;
    // react-native-view-shot has no web implementation (it throws immediately there), and a real
    // capture can fail on-device too (permissions, low memory) — always fall back to a text share
    // rather than let either case surface as an uncaught error.
    if (Platform.OS === "web") {
      shareAsText();
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        shareAsText();
      }
    } catch (error) {
      console.warn("Failed to capture PR celebration screenshot, falling back to text share", error);
      shareAsText();
    } finally {
      setSharing(false);
    }
  }

  function handleNext() {
    if (isLast) {
      router.replace({ pathname: "/workout/summary", params: { id: workout!.id } });
    } else {
      setIndex((current) => current + 1);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top }}>
      {/* Everything the shared screenshot should include — the header, medal, and PR details,
          not the Next/Back navigation controls below. Kept as its own flex:1 wrapper so the
          medal/details still center in the available space exactly as before. */}
      <View ref={shareCardRef} collapsable={false} style={{ flex: 1, backgroundColor: "#000000" }}>
        <Animated.View
          key={`header-${pr.exerciseId}`}
          entering={FadeIn.duration(400)}
          className="flex-row items-center justify-between px-4 pb-2"
        >
          <View style={{ width: 22 }} />
          <Text style={wordmarkStyle}>
            <Text className="text-text-primary">GYM</Text>
            <Text className="text-brand-yellow">CREW</Text>
          </Text>
          <Pressable onPress={handleShare} hitSlop={10} disabled={sharing}>
            <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={22} color={colors.neutral.textPrimary} />
          </Pressable>
        </Animated.View>

        <View className="flex-1 items-center justify-center gap-6 px-8">
          <Animated.View
            key={`label-${pr.exerciseId}`}
            entering={FadeInDown.delay(100).duration(350)}
            className="items-center gap-1"
          >
            <Text className="body-md font-body-semibold tracking-wide text-brand-yellow">NEW PERSONAL RECORD</Text>
            {canCalculateRank && (
              <Text className="caption text-text-secondary">{formatRankTier(rankTier)} Tier</Text>
            )}
          </Animated.View>

          <View className="items-center justify-center" style={{ width: MEDAL_WIDTH, height: MEDAL_WIDTH / MEDAL_ASPECT_RATIO }}>
            <MedalGlow key={`glow-${pr.exerciseId}`} />
            <ShockwaveRing triggerKey={pr.exerciseId} />
            <Animated.View key={`medal-${pr.exerciseId}`} entering={ZoomIn.springify().damping(9).mass(0.8).delay(250)}>
              <Image
                source={medalImage}
                resizeMode="contain"
                style={{ width: MEDAL_WIDTH, height: MEDAL_WIDTH / MEDAL_ASPECT_RATIO }}
              />
            </Animated.View>
            <Sparkles key={`sparkles-${pr.exerciseId}`} />
          </View>

          <Animated.View
            key={`details-${pr.exerciseId}`}
            entering={FadeInUp.delay(550).springify().damping(16)}
            className="items-center gap-2"
          >
            <Text className="heading-3 text-center text-text-primary">{pr.exerciseName}</Text>
            <Text className="heading-4 mt-1 text-text-primary">
              {displayWeight}
              {workout.unit} × {pr.reps} reps
            </Text>

            {percentIncrease !== null && (
              <Animated.Text
                entering={FadeIn.delay(900).duration(350)}
                className="body-lg font-body-semibold text-success"
              >
                +{percentIncrease.toFixed(1)}% from last time
              </Animated.Text>
            )}

            <Animated.Text entering={FadeIn.delay(1050).duration(350)} className="body-sm mt-1 text-text-secondary">
              {timeSince ? `${timeSince} since your last PR` : "First time logging this lift"}
            </Animated.Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        key={`footer-${pr.exerciseId}`}
        entering={FadeInUp.delay(1150).duration(400)}
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 16 }}
      >
        {workout.prs.length > 1 && (
          <View className="flex-row items-center justify-center gap-2">
            {workout.prs.map((p, i) => (
              <View
                key={p.exerciseId}
                className={`h-1.5 rounded-full ${i === index ? "w-6 bg-brand-yellow" : "w-1.5 bg-divider"}`}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={handleNext}
          className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        >
          <Text className="body-lg font-body-semibold text-brand-iron">{isLast ? "Back to Summary" : "Next"}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
