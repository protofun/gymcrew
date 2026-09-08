import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { RankBadge } from "@/components/RankBadge";
import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors } from "@/theme";

/** Home's nudge into the Smart Split generator (workout-split/intro.tsx) — surfaces the single
 * muscle group furthest behind, so there's always something concrete to tap into rather than a
 * generic "build a split" banner. Insufficient-data groups count as furthest behind, same
 * convention the generator itself uses (see lib/workout-split-generator.ts). */
export function BiggestOpportunityCard() {
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);

  const weakest = ALL_MUSCLE_GROUPS.map((group) => {
    const rank = ranksByGroup[group];
    return { group, tierIndex: rank?.status === "ranked" ? rank.tierIndex : -1 };
  }).reduce((min, entry) => (entry.tierIndex < min.tierIndex ? entry : min));

  return (
    <Pressable
      onPress={() => router.push("/workout-split/intro")}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className="mx-4 mt-6 flex-row items-center gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4"
    >
      {weakest.tierIndex >= 0 ? (
        <RankBadge tier={RANK_TIERS[weakest.tierIndex]} size={36} />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-full border border-dashed border-divider">
          <Ionicons name="help" size={18} color={colors.neutral.textSecondary} />
        </View>
      )}
      <View className="flex-1">
        <Text className="body-md font-body-semibold text-text-primary">{formatMuscleLabel(weakest.group)} is your biggest opportunity</Text>
        <Text className="caption text-text-secondary">
          {weakest.tierIndex >= 0
            ? `Currently ${formatRankTier(RANK_TIERS[weakest.tierIndex])} — build a split to close the gap.`
            : "Not enough data yet — build a split to start closing gaps."}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.brand.yellow} />
    </Pressable>
  );
}
