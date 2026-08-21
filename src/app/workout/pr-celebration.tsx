import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { BadgeRevealFx } from "@/components/BadgeRevealFx";
import { useDecimalCountUp } from "@/hooks/use-decimal-count-up";
import { calculateLiftRank, formatRankTier, majorLiftForExerciseId } from "@/lib/rank";
import { formatTimeSince } from "@/lib/time-since";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const MEDAL_WIDTH = 180;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native
// when combined with a sibling className — see theme/typography.ts.
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 22,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

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

          <BadgeRevealFx tier={rankTier} triggerKey={pr.exerciseId} size={MEDAL_WIDTH} />

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
