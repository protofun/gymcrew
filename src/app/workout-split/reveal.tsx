import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { RankBadge } from "@/components/RankBadge";
import { images } from "@/constants/images";
import { WEEKDAYS, WEEKDAY_SHORT_LABEL } from "@/data/weekdays";
import type { MuscleGroup } from "@/data/workout-log";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { generateWorkoutSplit, type GeneratedPlan } from "@/lib/workout-split-generator";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { useWorkoutSplitStore } from "@/store/workout-split-store";
import { colors, fontFamily } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

function tierSpreadToIntensity(spread: [MuscleGroup, number][]): Partial<Record<MuscleGroup, number>> {
  const intensity: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, tierIndex] of spread) {
    if (tierIndex >= 0) intensity[group] = tierIndex;
  }
  return intensity;
}

export default function WorkoutSplitRevealScreen() {
  const insets = useSafeAreaInsets();
  const preferences = useWorkoutSplitStore((state) => state.preferences);
  const acceptPlan = useWorkoutSplitStore((state) => state.acceptPlan);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);

  const [generating, setGenerating] = useState(true);
  const [regenerationTick, setRegenerationTick] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);

  // Regenerate = call this again with whatever's true right now — no separate code path, and it
  // naturally reflects any ranks/history changes since the plan was first built. `regenerationTick`
  // isn't read inside the callback — it's a deliberate cache-buster so pressing "Regenerate" forces
  // a fresh call even when ranks/history/preferences all still look identical.
  const plan: GeneratedPlan | null = useMemo(() => {
    if (!preferences) return null;
    return generateWorkoutSplit(ranksByGroup, workouts, preferences);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences, ranksByGroup, workouts, regenerationTick]);

  useEffect(() => {
    if (!preferences) {
      router.replace("/workout-split/setup");
      return;
    }
    const timer = setTimeout(() => setGenerating(false), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!preferences || !plan) return null;

  if (generating) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-6">
        <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 140, height: 140 * (205 / 250) }} />
        <ActivityIndicator size="large" color={colors.brand.yellow} />
        <Text className="body-md text-center text-text-secondary">Reading your body graph…</Text>
      </View>
    );
  }

  const currentIndices = plan.missionSummary.currentTierSpread.map(([, i]) => i).filter((i) => i >= 0);
  const targetIndices = plan.missionSummary.targetTierSpread.map(([, i]) => i);
  const currentMinIndex = currentIndices.length ? Math.min(...currentIndices) : 0;
  const currentMaxIndex = currentIndices.length ? Math.max(...currentIndices) : 0;
  const targetMinIndex = Math.min(...targetIndices);
  const targetMaxIndex = Math.max(...targetIndices);

  const dayByWeekday = new Map(plan.days.map((day) => [day.weekday, day]));

  function handleAccept() {
    if (!plan) return;
    acceptPlan(plan);
    setAccepted(true);
  }

  if (accepted) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }} className="items-center justify-center gap-4 bg-background px-6">
        <Ionicons name="checkmark-circle" size={64} color={colors.semantic.success} />
        <Text className="heading-3 text-center text-text-primary">Your split is locked in</Text>
        <Text className="body-md text-center text-text-secondary">Head to your training schedule to see it any time.</Text>
        <Pressable onPress={() => router.replace("/(tabs)/profile")} style={PRESSED_STYLE} className="mt-2 items-center rounded-full bg-brand-yellow px-8 py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Your Split Is Ready</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 120, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-2.5 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flag" size={14} color={colors.brand.yellow} />
            <Text className="caption font-body-semibold text-brand-yellow">THIS WEEK&apos;S MISSION</Text>
          </View>
          <Text className="body-md font-body-semibold text-text-primary">Close the gap</Text>
          <View className="flex-row items-center gap-2">
            <RankBadge tier={RANK_TIERS[currentMinIndex]} size={22} />
            <Text className="body-sm text-text-secondary">{formatRankTier(RANK_TIERS[currentMinIndex])}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.neutral.textSecondary} />
            <RankBadge tier={RANK_TIERS[currentMaxIndex]} size={22} />
            <Text className="body-sm text-text-secondary">{formatRankTier(RANK_TIERS[currentMaxIndex])}</Text>
          </View>
          <Text className="caption text-text-secondary">
            Target spread: {formatRankTier(RANK_TIERS[targetMinIndex])} → {formatRankTier(RANK_TIERS[targetMaxIndex])} · Potential rank-ups:{" "}
            {plan.missionSummary.potentialRankUps}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="gap-2.5">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            YOUR WEEK
          </Text>
          <View className="gap-2">
            {WEEKDAYS.map((weekday) => {
              const day = dayByWeekday.get(weekday);
              return (
                <Pressable
                  key={weekday}
                  disabled={!day}
                  onPress={() => day && router.push({ pathname: "/workout-split/day/[weekday]", params: { weekday } })}
                  style={PRESSED_STYLE}
                  className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-4 py-3"
                >
                  <View className="w-10 items-center">
                    <Text className="caption font-body-semibold text-text-secondary">{WEEKDAY_SHORT_LABEL[weekday].toUpperCase()}</Text>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="body-sm font-body-semibold text-text-primary">{day ? day.name : "Rest"}</Text>
                    {day && (
                      <Text className="caption text-text-secondary" numberOfLines={1}>
                        {day.focusGroups.map(formatMuscleLabel).join(" · ")}
                      </Text>
                    )}
                  </View>
                  {day && <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify().damping(16).mass(0.6)} className="gap-2.5">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            WHY WE BUILT IT THIS WAY
          </Text>
          {/* Muscle + weekly count up top (the two things that matter most), current → target
              spelled out in words underneath each badge so it's never ambiguous which is which. */}
          <View className="gap-2">
            {plan.explanation.map((entry) => (
              <View key={entry.group} className="gap-2 rounded-2xl border border-divider bg-surface p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="body-sm font-body-semibold text-text-primary">{formatMuscleLabel(entry.group)}</Text>
                  <View className="rounded-full bg-brand-yellow/15 px-2.5 py-1">
                    <Text className="caption font-body-bold text-brand-yellow">{entry.weeklyExposures}x / week</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <RankBadge tier={entry.currentTierIndex >= 0 ? RANK_TIERS[entry.currentTierIndex] : RANK_TIERS[0]} size={20} dimmed={entry.currentTierIndex < 0} />
                  <Text className="caption text-text-secondary">
                    {entry.currentTierIndex >= 0 ? formatRankTier(RANK_TIERS[entry.currentTierIndex]) : "No data"} now
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.neutral.textSecondary} />
                  <RankBadge tier={RANK_TIERS[entry.targetTierIndex]} size={20} />
                  <Text className="caption font-body-semibold text-text-primary">{formatRankTier(RANK_TIERS[entry.targetTierIndex])} target</Text>
                </View>
              </View>
            ))}
            {plan.explanation.length === 0 && (
              <Text className="body-sm text-text-secondary">Your ranks are already well balanced — this split keeps everything maintained.</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify().damping(16).mass(0.6)} className="gap-3">
          <Text style={sectionHeaderStyle} className="text-text-primary">
            CURRENT → TARGET
          </Text>
          <View className="gap-4 rounded-2xl border border-divider bg-surface p-4">
            <View className="gap-2">
              <Text className="caption font-body-semibold text-text-secondary">CURRENT</Text>
              <MuscleHeatmap
                muscleIntensity={tierSpreadToIntensity(plan.missionSummary.currentTierSpread)}
                showLegend={false}
                colorForIntensity={(i) => RANK_TIER_COLOR[RANK_TIERS[i]]}
                gender={gender}
                height={160}
              />
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="arrow-down" size={16} color={colors.brand.yellow} />
              <Text className="caption font-body-semibold text-brand-yellow">Your plan is designed to move you here</Text>
            </View>
            <View className="gap-2">
              <Text className="caption font-body-semibold text-text-secondary">TARGET</Text>
              <MuscleHeatmap
                muscleIntensity={tierSpreadToIntensity(plan.missionSummary.targetTierSpread)}
                showLegend={false}
                colorForIntensity={(i) => RANK_TIER_COLOR[RANK_TIERS[i]]}
                gender={gender}
                height={160}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }} className="gap-2">
        <Pressable onPress={handleAccept} style={PRESSED_STYLE} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Accept Plan</Text>
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setRegenerationTick((tick) => tick + 1)}
            style={PRESSED_STYLE}
            className="flex-1 items-center rounded-full border border-divider bg-surface py-3.5"
          >
            <Text className="body-sm font-body-semibold text-text-primary">Regenerate</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/workout-split/setup")}
            style={PRESSED_STYLE}
            className="flex-1 items-center rounded-full border border-divider bg-surface py-3.5"
          >
            <Text className="body-sm font-body-semibold text-text-primary">Customize</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
