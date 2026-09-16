import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { RankRevealCard } from "@/components/RankRevealCard";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { calculateLiftRankDetail, type MajorLift, type RankProfile } from "@/lib/rank";
import { displayWeight } from "@/lib/units";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type LiftEntry = { lift: MajorLift; name: string; weightKg: number };

/**
 * The onboarding "instant rank" moment — reuses the exact same medal-reveal card (RankRevealCard +
 * BadgeRevealFx) as a real PR celebration, fed by the bench/squat/deadlift numbers just entered on
 * Your Metrics instead of a logged set. Deliberately never touches personal-records-store: this is
 * a motivational preview, not a verified record, so it can't be used to fake a rank (same principle
 * as why a backfilled workout never counts toward PRs — see workout/active.tsx). The disclaimer +
 * "log a real set" CTA make that explicit rather than letting it pass as official.
 */
export default function OnboardingRankRevealScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const weightUnit = useWeightUnit();
  const posthog = usePostHog();
  const [index, setIndex] = useState(0);

  const profile: RankProfile = {
    gender: onboarding.gender ?? "male",
    bodyWeightKg: onboarding.weightKg ?? 85,
    age: onboarding.age,
  };

  const lifts: LiftEntry[] = (
    [
      { lift: "benchPress", name: "Bench Press", weightKg: onboarding.benchPress1RM ?? 0 },
      { lift: "squat", name: "Squat", weightKg: onboarding.squat1RM ?? 0 },
      { lift: "deadlift", name: "Deadlift", weightKg: onboarding.deadlift1RM ?? 0 },
    ] satisfies LiftEntry[]
  ).filter((entry) => entry.weightKg > 0);

  function goNext() {
    router.push("/onboarding/workout-preferences");
  }

  if (lifts.length === 0) {
    goNext();
    return null;
  }

  const entry = lifts[index];
  const isLast = index === lifts.length - 1;
  const rankDetail = calculateLiftRankDetail(entry.lift, entry.weightKg, profile);
  const topPercent = Math.max(1, 100 - Math.round(rankDetail.progressToNextTier * 100));

  function handleNext() {
    if (isLast) {
      posthog.capture("onboarding_rank_reveal_completed");
      goNext();
    } else {
      setIndex((current) => current + 1);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top }}>
      <View style={{ flex: 1 }} className="items-center justify-center gap-4 px-6">
        <Animated.View key={`label-${entry.lift}`} entering={FadeInDown.delay(100).duration(350)} className="items-center gap-1">
          <Text className="body-md font-body-semibold tracking-wide text-brand-yellow">YOUR ESTIMATED RANK</Text>
        </Animated.View>

        <Animated.View key={`card-${entry.lift}`} entering={FadeInUp.delay(250).springify().damping(16)} className="w-full">
          <RankRevealCard
            id={`onboarding.rankReveal.${entry.lift}`}
            name={entry.name}
            tier={rankDetail.tier}
            weightKg={displayWeight(entry.weightKg, weightUnit)}
            reps={1}
            unit={weightUnit}
            topPercent={topPercent}
            progressToNextTier={rankDetail.progressToNextTier}
            triggerKey={entry.lift}
          />
        </Animated.View>

        <Animated.View
          key={`disclaimer-${entry.lift}`}
          entering={FadeIn.delay(900).duration(350)}
          className="max-w-xs flex-row items-start gap-2 rounded-2xl bg-surface px-4 py-3"
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.neutral.textSecondary} style={{ marginTop: 1 }} />
          <Text className="body-sm flex-1 text-text-secondary">
            Estimated from what you told us. Log a real set after your first workout to make it official.
          </Text>
        </Animated.View>
      </View>

      <Animated.View
        key={`footer-${entry.lift}`}
        entering={FadeInUp.delay(1150).duration(400)}
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 16 }}
      >
        {lifts.length > 1 && (
          <View className="flex-row items-center justify-center gap-2">
            {lifts.map((l, i) => (
              <View key={l.lift} className={`h-1.5 rounded-full ${i === index ? "w-6 bg-brand-yellow" : "w-1.5 bg-divider"}`} />
            ))}
          </View>
        )}

        <Pressable onPress={handleNext} className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4">
          <Text className="body-lg font-body-semibold text-brand-iron">{isLast ? "Continue" : "Next"}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
        </Pressable>
      </Animated.View>
    </View>
  );
}
