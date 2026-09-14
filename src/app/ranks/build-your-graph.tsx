import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { MuscleRankRow } from "@/components/MuscleRankRow";
import { RankBadge } from "@/components/RankBadge";
import { TierPickerSheet } from "@/components/TierPickerSheet";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankTier } from "@/lib/rank";
import { useCustomMuscleRanksStore } from "@/store/custom-muscle-ranks-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors, fontFamily } from "@/theme";

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

/**
 * Dev Mode tool — a body graph you fill in by hand rather than one computed from real lift data
 * (see ranks/body-graph.tsx for the real version). Deliberately styled and copy-matched to be
 * indistinguishable from the real Muscle Rank screen (same title, labels, tier-badge row, hint
 * text) — this is for producing a convincing graph for marketing/screenshots, so it must never
 * read as an obvious test/sandbox tool. Nothing here reads or writes real rank data. Reached only
 * via the Dev-Mode-gated button in (tabs)/ranks.tsx.
 */
export default function BuildYourGraphScreen() {
  const insets = useSafeAreaInsets();
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const tiersByGroup = useCustomMuscleRanksStore((state) => state.tiersByGroup);
  const setGroupTier = useCustomMuscleRanksStore((state) => state.setGroupTier);
  const clearAll = useCustomMuscleRanksStore((state) => state.clearAll);

  const tierIndexByGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, tier] of Object.entries(tiersByGroup) as [MuscleGroup, RankTier][]) {
    tierIndexByGroup[group] = RANK_TIERS.indexOf(tier);
  }
  const assignedCount = Object.keys(tiersByGroup).length;
  const selectedTier = selectedGroup ? (tiersByGroup[selectedGroup] ?? null) : null;
  // Same "one badge per tier actually reached" idea as the real Muscle Rank screen — several
  // muscles can share a tier, so this de-dupes rather than repeating it once per muscle.
  const presentTiers = Array.from(new Set(Object.values(tierIndexByGroup))).sort((a, b) => b - a);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => goBack("/(tabs)/ranks")} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Muscle Rank</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.6)}
          className="gap-4 rounded-2xl border border-divider bg-surface p-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1 }}>
              BODY OVERVIEW
            </Text>
            <View className="rounded-full border border-divider px-2.5 py-1">
              <Text className="caption font-body-bold text-text-primary">
                {assignedCount}/{ALL_MUSCLE_GROUPS.length} RANKED
              </Text>
            </View>
          </View>

          <MuscleHeatmap
            muscleIntensity={tierIndexByGroup}
            showLegend={false}
            colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
            onPressGroup={(group) => setSelectedGroup(group)}
            gender={gender}
          />

          {presentTiers.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-2">
              {presentTiers.map((tierIndex) => {
                const tier = RANK_TIERS[tierIndex];
                return (
                  <View key={tier} className="flex-row items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
                    <RankBadge tier={tier} size={16} />
                    <Text className="caption font-body-semibold" style={{ color: RANK_TIER_COLOR[tier] }}>
                      {formatRankTier(tier)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {assignedCount > 0 && (
            <Pressable
              onPress={clearAll}
              className="flex-row items-center justify-center gap-2 rounded-full border border-divider py-3"
            >
              <Ionicons name="refresh" size={14} color={colors.neutral.textSecondary} />
              <Text className="body-sm font-body-semibold text-text-secondary">Reset All</Text>
            </Pressable>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify().damping(16).mass(0.6)} className="gap-1">
          <Text style={sectionHeaderStyle} className="text-brand-white">
            MUSCLE GROUPS
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="hand-left" size={13} color={colors.brand.yellow} />
            <Text className="caption font-body-semibold text-text-secondary">Tap any group to see what&apos;s behind the number.</Text>
          </View>
        </Animated.View>

        <View className="gap-2.5">
          {ALL_MUSCLE_GROUPS.map((group, index) => (
            <MuscleRankRow
              key={group}
              group={group}
              tier={tiersByGroup[group] ?? null}
              index={index}
              onPress={() => setSelectedGroup(group)}
              unrankedLabel="Tap to assign"
            />
          ))}
        </View>
      </ScrollView>

      <TierPickerSheet
        visible={selectedGroup !== null}
        title={selectedGroup ? `Assign a rank — ${formatMuscleLabel(selectedGroup)}` : "Assign a rank"}
        selectedTier={selectedTier}
        onSelect={(tier) => {
          if (selectedGroup) setGroupTier(selectedGroup, tier);
          setSelectedGroup(null);
        }}
        onClose={() => setSelectedGroup(null)}
      />
    </View>
  );
}
