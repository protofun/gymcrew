import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { RankRevealCard } from "@/components/RankRevealCard";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import type { RankProfile } from "@/lib/rank";
import { formatTimeSince } from "@/lib/time-since";
import { displayWeight, formatWeight } from "@/lib/units";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function PrCelebrationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkoutHistoryStore((state) => state.workouts.find((w) => w.id === id));
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const weightUnit = useWeightUnit();
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const hasPrs = !!workout && workout.prs.length > 0;
  const pr = hasPrs ? workout.prs[index] : null;

  // Same generic muscle-group-proxy tier lookup used by the summary screen's PRs tab and the
  // Personal Records screen (`genericExerciseRankDetail`) — every exercise gets a real tier this
  // way, not just the 4 major lifts, so this card never falls back to a made-up default.
  const rankProfile: RankProfile = {
    gender: onboarding.gender ?? "male",
    bodyWeightKg: onboarding.weightKg ?? 85,
    age: onboarding.age,
  };
  const exercise = pr ? (EXERCISE_BY_ID[pr.exerciseId] ?? customExercises.find((candidate) => candidate.id === pr.exerciseId)) : null;
  const rankDetail = exercise && pr ? genericExerciseRankDetail(exercise, pr.weightKg, pr.reps, rankProfile) : null;
  const rankTier = rankDetail?.tier ?? "rookie";
  const topPercent = rankDetail ? Math.max(1, 100 - Math.round(rankDetail.progressToNextTier * 100)) : null;

  if (!workout || !pr) {
    router.replace({ pathname: "/workout/summary", params: { id: id ?? "", justFinished: "1" } });
    return null;
  }

  const isLast = index === workout.prs.length - 1;
  const percentIncrease =
    pr.previousBestKg && pr.previousBestKg > 0 ? ((pr.weightKg - pr.previousBestKg) / pr.previousBestKg) * 100 : null;
  const timeSince = pr.previousAchievedAt ? formatTimeSince(pr.previousAchievedAt, Date.now()) : null;

  function shareAsText() {
    // Share.share returns a rejected promise on web when the browser has no native share sheet
    // (e.g. non-HTTPS or headless contexts) — .catch() it so that never surfaces as an unhandled
    // rejection (a plain try/catch around the call wouldn't catch an async rejection like this).
    Share.share({
      message: `New PR on ${pr!.exerciseName}: ${formatWeight(pr!.weightKg, weightUnit)} × ${pr!.reps} reps${
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
      router.replace({ pathname: "/workout/summary", params: { id: workout!.id, justFinished: "1" } });
    } else {
      setIndex((current) => current + 1);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top }}>
      {/* Everything the shared screenshot should include — the label, card, and PR details, not
          the Next/Back navigation controls below. Kept as its own flex:1 wrapper so it still
          centers in the available space exactly as before. The card itself is `RankRevealCard` —
          the same canonical medal-reveal card "What's my rank?" uses — with only the screen-
          specific extras (the "NEW PERSONAL RECORD" label, the %-increase, time-since-last-PR)
          added around it, so this never grows its own, different-looking version of that card. */}
      <View ref={shareCardRef} collapsable={false} style={{ flex: 1 }} className="items-center justify-center gap-4 px-6">
        <Animated.View key={`label-${pr.exerciseId}`} entering={FadeInDown.delay(100).duration(350)} className="items-center gap-1">
          <Text className="body-md font-body-semibold tracking-wide text-brand-yellow">NEW PERSONAL RECORD</Text>
        </Animated.View>

        <Animated.View key={`card-${pr.exerciseId}`} entering={FadeInUp.delay(250).springify().damping(16)} className="w-full">
          <RankRevealCard
            id={`workout.prCelebration.${pr.exerciseId}`}
            name={pr.exerciseName}
            tier={rankTier}
            weightKg={displayWeight(pr.weightKg, weightUnit)}
            reps={pr.reps}
            unit={weightUnit}
            topPercent={topPercent}
            progressToNextTier={rankDetail?.progressToNextTier ?? null}
            triggerKey={pr.exerciseId}
            headerRight={
              <Pressable onPress={handleShare} hitSlop={10} disabled={sharing}>
                <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={18} color={colors.neutral.textSecondary} />
              </Pressable>
            }
          />
        </Animated.View>

        <Animated.View key={`details-${pr.exerciseId}`} entering={FadeIn.delay(900).duration(350)} className="items-center gap-1">
          {percentIncrease !== null && (
            <Text className="body-lg font-body-semibold text-success">+{percentIncrease.toFixed(1)}% from last time</Text>
          )}
          <Text className="body-sm text-text-secondary">{timeSince ? `${timeSince} since your last PR` : "First time logging this lift"}</Text>
        </Animated.View>
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
