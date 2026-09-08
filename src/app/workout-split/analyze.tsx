import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { RankBadge } from "@/components/RankBadge";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { userOverallPowerScore } from "@/lib/ranks-board";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });
/** How many "next opportunities" to surface — enough to feel real, not an overwhelming full list. */
const OPPORTUNITY_COUNT = 4;

export default function WorkoutSplitAnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const removedDefaultIds = useTrackedLiftsStore((state) => state.removedDefaultIds);
  const hiddenAchievementIds = useTrackedLiftsStore((state) => state.hiddenAchievementIds);
  const customExerciseIds = useTrackedLiftsStore((state) => state.customExerciseIds);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);
  // Same figure as the Ranks tab's own hero card — must account for the user's board customization
  // (removed/hidden/pinned tiles), not just the 9 built-in tracked lifts, or the two screens disagree.
  const power = useMemo(
    () => userOverallPowerScore(records, profile, removedDefaultIds, hiddenAchievementIds, customExerciseIds),
    [records, profile, removedDefaultIds, hiddenAchievementIds, customExerciseIds],
  );

  const tierIndexByGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, rank] of Object.entries(ranksByGroup) as [MuscleGroup, MuscleGroupRank][]) {
    if (rank.status === "ranked") tierIndexByGroup[group] = rank.tierIndex;
  }

  // Weakest first — insufficient-data groups (no ranked lift at all) count as furthest behind, same
  // convention the priority algorithm itself uses (see workout-split-generator.ts).
  const opportunities = ALL_MUSCLE_GROUPS.map((group) => ({ group, tierIndex: tierIndexByGroup[group] ?? -1 }))
    .sort((a, b) => a.tierIndex - b.tierIndex)
    .slice(0, OPPORTUNITY_COUNT);

  const rankedEntries = Object.entries(tierIndexByGroup) as [MuscleGroup, number][];
  const strongest = rankedEntries.length > 0 ? rankedEntries.reduce((max, entry) => (entry[1] > max[1] ? entry : max)) : null;
  const weakest = rankedEntries.length > 0 ? rankedEntries.reduce((min, entry) => (entry[1] < min[1] ? entry : min)) : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Analyze My Body</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 100, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="gap-4 rounded-2xl border border-divider bg-surface p-4">
          <MuscleHeatmap
            muscleIntensity={tierIndexByGroup}
            showLegend={false}
            colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
            gender={gender}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(60).springify().damping(16).mass(0.6)} className="gap-3 rounded-2xl border border-divider bg-surface p-4">
          <Text className="caption font-body-semibold text-text-secondary">YOUR CURRENT BALANCE</Text>
          <View className="flex-row items-center justify-between">
            <Text className="body-sm text-text-secondary">Overall Power</Text>
            <Text className="body-md font-body-bold text-text-primary">{power.toLocaleString("en-US")}</Text>
          </View>
          {strongest && (
            <View className="flex-row items-center justify-between">
              <Text className="body-sm text-text-secondary">Strongest</Text>
              <View className="flex-row items-center gap-1.5">
                <RankBadge tier={RANK_TIERS[strongest[1]]} size={18} />
                <Text className="body-sm font-body-semibold text-text-primary">
                  {formatMuscleLabel(strongest[0])} — {formatRankTier(RANK_TIERS[strongest[1]])}
                </Text>
              </View>
            </View>
          )}
          {weakest && (
            <View className="flex-row items-center justify-between">
              <Text className="body-sm text-text-secondary">Next Opportunity</Text>
              <View className="flex-row items-center gap-1.5">
                <RankBadge tier={RANK_TIERS[weakest[1]]} size={18} />
                <Text className="body-sm font-body-semibold text-text-primary">
                  {formatMuscleLabel(weakest[0])} — {formatRankTier(RANK_TIERS[weakest[1]])}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).springify().damping(16).mass(0.6)} className="gap-2.5">
          <Text className="body-md font-body-semibold text-text-primary">Your biggest opportunities</Text>
          <View className="gap-2">
            {opportunities.map(({ group, tierIndex }) => (
              <View key={group} className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3">
                <Text className="body-sm font-body-semibold text-text-primary">{formatMuscleLabel(group)}</Text>
                {tierIndex >= 0 ? (
                  <View className="flex-row items-center gap-1.5">
                    <RankBadge tier={RANK_TIERS[tierIndex]} size={20} />
                    <Text className="caption font-body-semibold text-text-secondary">{formatRankTier(RANK_TIERS[tierIndex])}</Text>
                  </View>
                ) : (
                  <Text className="caption font-body-semibold text-text-secondary">No data yet</Text>
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.push("/workout-split/setup")} style={PRESSED_STYLE} className="items-center rounded-full bg-brand-yellow py-4">
          <Text className="body-md font-body-semibold text-brand-iron">Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
