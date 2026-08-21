import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_MUSCLE_GROUPS } from "@/data/workout-log";
import { DivisionBadge } from "@/components/DivisionBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard, StatRow, StatSectionHeader } from "@/components/StatRow";
import { DIVISION_COLOR } from "@/lib/division";
import { buildLiftRankCards, overallPowerScore, highestTier } from "@/lib/lift-rank-cards";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { computeMuscleGroupRanks } from "@/lib/muscle-group-rank";
import { formatRankTier, RANK_TIER_COLOR } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

export default function RankHistoryScreen() {
  const insets = useSafeAreaInsets();
  const division = useProfileLevelStore((state) => state.division);
  const xp = useProfileLevelStore((state) => state.xp);
  const divisionHistory = useProfileLevelStore((state) => state.divisionHistory);
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const records = usePersonalRecordsStore((state) => state.records);

  const cards = useMemo(
    () => buildLiftRankCards(records, { gender: onboarding.gender ?? "male", bodyWeightKg: onboarding.weightKg ?? 85, age: onboarding.age }, "gym"),
    [records, onboarding.gender, onboarding.weightKg, onboarding.age],
  );
  const powerScore = overallPowerScore(cards);
  const topTier = highestTier(cards);
  const weakPoints = cards.filter((card) => card.isWeakPoint);
  const muscleRanks = useMemo(() => computeMuscleGroupRanks(cards), [cards]);
  const rankedMuscleGroups = ALL_MUSCLE_GROUPS.flatMap((group) => {
    const rank = muscleRanks[group];
    return rank?.status === "ranked" ? [{ group, rank }] : [];
  });

  const timeline = divisionHistory.map((entry, index) => {
    const next = divisionHistory[index + 1];
    const endMs = next ? next.reachedAt : Date.now();
    const days = Math.max(0, Math.round((endMs - entry.reachedAt) / 86400000));
    return { ...entry, days, isCurrent: !next };
  });

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Rank Over Time</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4">
          <DivisionBadge division={division} size={56} />
          <View className="flex-1">
            <Text className="body-lg font-body-bold" style={{ color: DIVISION_COLOR[division] }}>
              {division}
            </Text>
            <Text className="caption text-text-secondary">{xp.toLocaleString("en-US")} total XP earned</Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="body-md font-body-semibold text-text-primary">Division Timeline</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
            <View className="flex-row items-start">
              {timeline.map((entry, index) => {
                const tint = DIVISION_COLOR[entry.division];
                const isLast = index === timeline.length - 1;
                return (
                  <View key={entry.division} className="flex-row items-start">
                    <View className="items-center" style={{ width: 84 }}>
                      <View
                        className="items-center justify-center rounded-full border-2 bg-background"
                        style={{ width: 48, height: 48, borderColor: entry.isCurrent ? tint : colors.neutral.divider }}
                      >
                        <DivisionBadge division={entry.division} size={36} />
                      </View>
                      <Text className="caption mt-2 font-body-bold text-text-primary" numberOfLines={1}>
                        {entry.division}
                      </Text>
                      <Text className="caption text-center text-text-secondary" numberOfLines={1}>
                        {entry.isCurrent ? `${entry.days}d so far` : `${entry.days}d`}
                      </Text>
                    </View>
                    {!isLast && <View style={{ width: 22, height: 2, backgroundColor: colors.neutral.divider, marginTop: 23 }} />}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="Overview" />
          <StatCard>
            <StatRow label="Power Score" value={powerScore.toLocaleString("en-US")} valueColor={colors.brand.yellow} />
            <StatRow label="Highest Tier Reached" value={formatRankTier(topTier)} valueColor={RANK_TIER_COLOR[topTier]} />
            <StatRow
              label="Weak Points"
              value={weakPoints.length > 0 ? weakPoints.map((card) => card.name).join(", ") : "None"}
              valueColor={weakPoints.length > 0 ? colors.semantic.error : colors.semantic.success}
              isLast
            />
          </StatCard>
        </View>

        <View className="gap-2">
          <StatSectionHeader label="Per-Lift Breakdown" />
          <View className="gap-2.5">
            {cards.map((card) => (
              <View key={card.id} className="gap-2 rounded-2xl border border-divider bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Text className="body-md font-body-semibold text-text-primary">{card.name}</Text>
                    {card.isWeakPoint && <Ionicons name="alert-circle" size={14} color={colors.semantic.error} />}
                  </View>
                  <Text className="caption font-body-bold" style={{ color: RANK_TIER_COLOR[card.tier] }}>
                    {formatRankTier(card.tier)}
                  </Text>
                </View>
                <ProgressBar ratio={card.percentileInTier} color={RANK_TIER_COLOR[card.tier]} height={6} />
                <View className="flex-row items-center justify-between">
                  <Text className="caption text-text-secondary">
                    {card.bestWeightKg > 0 ? `${card.bestWeightKg}kg × ${card.bestReps}` : "Not logged yet"}
                  </Text>
                  <Text className="caption text-text-secondary">
                    {card.kgToNextTier != null ? `${card.kgToNextTier}kg to next tier` : "Top tier"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {rankedMuscleGroups.length > 0 && (
          <View className="gap-2">
            <StatSectionHeader label="Muscle Group Ranks" />
            <StatCard>
              {rankedMuscleGroups.map(({ group, rank }, index) => (
                <StatRow
                  key={group}
                  label={formatMuscleLabel(group)}
                  value={formatRankTier(rank.tier)}
                  valueColor={RANK_TIER_COLOR[rank.tier]}
                  isLast={index === rankedMuscleGroups.length - 1}
                />
              ))}
            </StatCard>
          </View>
        )}

        <View className="gap-2.5">
          <Text className="body-md font-body-semibold text-text-primary">More</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/ranks")}
            style={PRESSED_STYLE}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <Ionicons name="trophy" size={18} color={colors.brand.yellow} />
            <View className="flex-1">
              <Text className="body-md font-body-semibold text-text-primary">Lift Ranks Overview</Text>
              <Text className="caption text-text-secondary">Every tracked lift&apos;s current tier, gym & worldwide</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/ranks/history")}
            style={PRESSED_STYLE}
            className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-4"
          >
            <Ionicons name="time" size={18} color={colors.brand.yellow} />
            <View className="flex-1">
              <Text className="body-md font-body-semibold text-text-primary">Rank-Up Timeline</Text>
              <Text className="caption text-text-secondary">See when you climbed each tier, lift by lift</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
