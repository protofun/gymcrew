import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { RankBadge } from "@/components/RankBadge";
import { muscleGroupImages } from "@/constants/images";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { memberLiftCards } from "@/lib/crew-lift-compare";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile } from "@/lib/rank";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
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

const rowTitleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

function GroupRow({ group, rank, index, onPress }: { group: MuscleGroup; rank: MuscleGroupRank; index: number; onPress: () => void }) {
  const ranked = rank.status === "ranked";
  const accent = ranked ? RANK_TIER_COLOR[rank.tier] : colors.neutral.divider;

  return (
    <Animated.View entering={FadeInUp.delay(180 + index * 50).springify().damping(16).mass(0.6)}>
      <Pressable
        onPress={onPress}
        style={PRESSED_STYLE}
        className="flex-row items-stretch overflow-hidden rounded-2xl border border-divider bg-surface"
      >
        <View style={{ width: 4, backgroundColor: accent }} />

        <View className="flex-1 flex-row items-center gap-3 p-3">
          {ranked ? (
            <RankBadge tier={rank.tier} size={40} />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full border border-dashed border-divider">
              <Ionicons name="help" size={16} color={colors.neutral.textSecondary} />
            </View>
          )}

          <View className="flex-1 gap-0.5">
            <Text style={rowTitleStyle} className="text-text-primary">
              {formatMuscleLabel(group).toUpperCase()}
            </Text>
            {ranked ? (
              <Text className="caption font-body-bold" style={{ color: accent }}>
                {formatRankTier(rank.tier).toUpperCase()}
              </Text>
            ) : (
              <Text className="caption font-body-semibold text-text-secondary">No data yet</Text>
            )}
          </View>
        </View>

        <View className="items-center justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color={colors.neutral.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function GroupDetailSheet({
  group,
  rank,
  onClose,
  canLog,
}: {
  group: MuscleGroup | null;
  rank: MuscleGroupRank | null;
  onClose: () => void;
  canLog: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={group !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        <Pressable onPress={() => {}} style={{ paddingBottom: insets.bottom + 20 }} className="gap-4 rounded-t-3xl border-t border-divider bg-surface p-5">
          {group && rank && (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="heading-4 text-text-primary">{formatMuscleLabel(group)}</Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
                </Pressable>
              </View>

              <Image
                source={muscleGroupImages[group]}
                resizeMode="cover"
                style={{ width: "100%", height: 160, borderRadius: 16 }}
              />

              {rank.status === "ranked" ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <RankBadge tier={rank.tier} size={56} />
                    <View>
                      <Text className="heading-4" style={{ color: RANK_TIER_COLOR[rank.tier] }}>
                        {formatRankTier(rank.tier)}
                      </Text>
                      <Text className="caption text-text-secondary">Composite rank for {formatMuscleLabel(group).toLowerCase()}</Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="caption font-body-semibold text-text-secondary">CONTRIBUTING LIFTS</Text>
                    {rank.contributingLifts.map((lift) => (
                      <View key={lift.liftId} className="flex-row items-center justify-between rounded-xl bg-background px-3 py-2.5">
                        <View className="flex-row items-center gap-2">
                          <RankBadge tier={lift.tier} size={22} />
                          <Text className="body-sm text-text-primary">{formatRankTier(lift.tier)}</Text>
                        </View>
                        <Text className="caption text-text-secondary">{Math.round(lift.weight * 100)}% weight</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row items-center gap-3">
                    <View className="h-14 w-14 items-center justify-center rounded-full border border-dashed border-divider">
                      <Ionicons name="help" size={24} color={colors.neutral.textSecondary} />
                    </View>
                    <View className="flex-1">
                      <Text className="body-md font-body-semibold text-text-primary">Not enough data yet</Text>
                      <Text className="body-sm text-text-secondary">
                        No linked exercises are tracked for {formatMuscleLabel(group).toLowerCase()} yet.
                      </Text>
                    </View>
                  </View>

                  {rank.suggestedExercises.length > 0 && (
                    <View className="gap-2 rounded-xl bg-background p-3">
                      <Text className="caption font-body-semibold text-text-secondary">TRY LOGGING</Text>
                      <Text className="body-sm text-text-primary">{rank.suggestedExercises.join(", ")}</Text>
                      <Text className="caption text-text-secondary">
                        Log at least {rank.sessionsNeeded} sessions to see a reliable {formatMuscleLabel(group).toLowerCase()} rank.
                      </Text>
                    </View>
                  )}

                  {canLog && (
                    <Pressable
                      onPress={() => {
                        onClose();
                        router.push("/(tabs)/log");
                      }}
                      style={PRESSED_STYLE}
                      className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
                    >
                      <Ionicons name="add-circle" size={18} color={colors.brand.iron} />
                      <Text className="body-md font-body-semibold text-brand-iron">Log This Exercise</Text>
                    </Pressable>
                  )}
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MuscleRankScreen() {
  const insets = useSafeAreaInsets();
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const crewMembers = useCrewStore((state) => state.members);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const myCards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  const viewingOtherMember = !!memberId && memberId !== CURRENT_MEMBER_ID;
  const viewedMember = viewingOtherMember ? crewMembers.find((member) => member.id === memberId) : undefined;
  const cards = useMemo(
    () => (viewingOtherMember ? memberLiftCards(memberId!, myCards) : myCards),
    [viewingOtherMember, memberId, myCards],
  );
  const ranksByGroup = useMemo(() => computeMuscleGroupRanks(cards), [cards]);

  const tierIndexByGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, rank] of Object.entries(ranksByGroup) as [MuscleGroup, MuscleGroupRank][]) {
    if (rank.status === "ranked") tierIndexByGroup[group] = rank.tierIndex;
  }

  const rankedCount = Object.keys(tierIndexByGroup).length;
  const presentTiers = Array.from(new Set(Object.values(tierIndexByGroup))).sort((a, b) => b - a);
  const hasInsufficientData = Object.values(ranksByGroup).some((rank) => rank?.status === "insufficient-data");

  const selectedRank = selectedGroup ? (ranksByGroup[selectedGroup] ?? null) : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">{viewedMember ? `${viewedMember.name}'s Muscle Rank` : "Muscle Rank"}</Text>
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
              {viewedMember ? `${viewedMember.name.toUpperCase()}'S OVERVIEW` : "BODY OVERVIEW"}
            </Text>
            <View className="rounded-full border border-divider px-2.5 py-1">
              <Text className="caption font-body-bold text-text-primary">{rankedCount}/{ALL_MUSCLE_GROUPS.length} RANKED</Text>
            </View>
          </View>

          <MuscleHeatmap
            muscleIntensity={tierIndexByGroup}
            showLegend={false}
            colorForIntensity={(tierIndex) => RANK_TIER_COLOR[RANK_TIERS[tierIndex]]}
            onPressGroup={(group) => setSelectedGroup(group)}
          />

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
            {hasInsufficientData && (
              <View className="flex-row items-center gap-1.5 rounded-full bg-background px-2.5 py-1">
                <View className="h-4 w-4 items-center justify-center rounded-full border border-dashed border-divider" />
                <Text className="caption font-body-semibold text-text-secondary">No data</Text>
              </View>
            )}
          </View>
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
          {ALL_MUSCLE_GROUPS.map((group, index) => {
            const rank = ranksByGroup[group];
            if (!rank) return null;
            return <GroupRow key={group} group={group} rank={rank} index={index} onPress={() => setSelectedGroup(group)} />;
          })}
        </View>
      </ScrollView>

      <GroupDetailSheet group={selectedGroup} rank={selectedRank} onClose={() => setSelectedGroup(null)} canLog={!viewingOtherMember} />
    </View>
  );
}
