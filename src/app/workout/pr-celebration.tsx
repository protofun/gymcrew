import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RankUpReveal } from "@/components/RankUpReveal";
import { EXERCISE_BY_ID } from "@/data/exercises";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import type { RankProfile } from "@/lib/rank";
import { shareViewAsImage } from "@/lib/share-image";
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

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      await shareViewAsImage({
        ref: shareCardRef,
        fileName: "gymcrew-pr.png",
        dialogTitle: "Share your PR",
        fallbackMessage: `New PR on ${pr!.exerciseName}: ${formatWeight(pr!.weightKg, weightUnit)} × ${pr!.reps} reps${
          percentIncrease !== null ? ` (+${percentIncrease.toFixed(1)}%)` : ""
        } on GymCrew! 💪`,
      });
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

  const revealWeightKg = displayWeight(pr.weightKg, weightUnit);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* The whole reveal (ladder, medal, stat dock) is now `RankUpReveal` — a genuinely different
          layout from the old single-badge-on-a-glow version this screen and `whats-my-rank.tsx`
          BOTH used to render separately ("ik wil niks meer hetzelfde als nu zien" — see that
          component's own doc comment for why a second coat of the same composition wasn't the
          fix). This screen's own job is just the PR-specific framing around it: the extra
          percent-increase/time-since line, and the Next/pagination footer. */}
      <RankUpReveal
        tier={rankTier}
        exerciseName={pr.exerciseName}
        exerciseImageUrl={exercise?.imageUrl}
        weightKg={revealWeightKg}
        reps={pr.reps}
        unit={weightUnit}
        topPercent={topPercent}
        progressToNextTier={rankDetail?.progressToNextTier ?? null}
        triggerKey={pr.exerciseId}
        shareRef={shareCardRef}
        headerRight={
          <Pressable onPress={handleShare} hitSlop={10} disabled={sharing}>
            <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={18} color={colors.brand.white} />
          </Pressable>
        }
        footer={
          <Animated.View entering={FadeIn.delay(1150).duration(400)} style={{ gap: 12, paddingBottom: insets.bottom + 8 }}>
            {percentIncrease !== null && (
              <Text className="body-md text-center font-body-semibold text-success">+{percentIncrease.toFixed(1)}% from last time</Text>
            )}
            <Text className="body-sm text-center text-text-secondary">{timeSince ? `${timeSince} since your last PR` : "First time logging this lift"}</Text>

            {workout.prs.length > 1 && (
              <View className="flex-row items-center justify-center gap-2">
                {workout.prs.map((p, i) => (
                  <View key={p.exerciseId} className={`h-1.5 rounded-full ${i === index ? "w-6 bg-brand-yellow" : "w-1.5 bg-divider"}`} />
                ))}
              </View>
            )}

            <Pressable onPress={handleNext} className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4">
              <Text className="body-lg font-body-semibold text-brand-iron">{isLast ? "Back to Summary" : "Next"}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
            </Pressable>
          </Animated.View>
        }
      />
    </View>
  );
}
