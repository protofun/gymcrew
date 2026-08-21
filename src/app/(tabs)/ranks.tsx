import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Share, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import { images } from "@/constants/images";
import { EXERCISE_BY_ID, type Exercise } from "@/data/exercises";
import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import {
  applyRankScope,
  buildLiftRankCards,
  LIFT_CARD_SORT_OPTIONS,
  SCORE_PER_BODYWEIGHT_RATIO,
  type LiftCardSortKey,
  type RankScope,
} from "@/lib/lift-rank-cards";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { colors, fontFamily } from "@/theme";

/** A tile on the Ranks overview grid — either one of the 9 default tracked lifts or a custom
 * exercise the user added (see store/tracked-lifts-store.ts). Deliberately not `LiftRankCard`
 * itself: custom exercises don't have a `LiftCardId`, a curated image, or a real PR-delta history,
 * so this only keeps the fields the grid tile and sort actually need. */
type DisplayLiftCard = {
  id: string;
  name: string;
  exerciseId: string;
  tier: RankTier;
  score: number;
  percentileInTier: number;
  gymRank: number;
  gymPoolSize: number;
  isWeakPoint: boolean;
  isCustom: boolean;
  bestWeightKg: number;
  /** `null` for custom exercises — there's no seeded PR-delta history for anything outside the 9
   * tracked lifts, so the card shows its best weight instead (see LiftCard). */
  prDeltaKg: number | null;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 12;
// Every tile (lift cards + the "Add more" tile) shares this exact size so the grid reads as a
// uniform 3-across row regardless of how much text a given card has.
const GRID_TILE_HEIGHT = 176;

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const bannerTitleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 40,
  lineHeight: 42,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

const sectionHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 30,
  lineHeight: 32,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.7 : 1 });

const SCOPES: { key: RankScope; label: string }[] = [
  { key: "gym", label: "MY GYM" },
  { key: "worldwide", label: "WORLDWIDE" },
];

type RanksBannerProps = {
  power: number;
  tier: RankTier;
  scope: RankScope;
  onChangeScope: (scope: RankScope) => void;
  onShare: () => void;
  onOpenHistory: () => void;
  onOpenMuscleRank: () => void;
  sharing: boolean;
};

function RanksBanner({ power, tier, scope, onChangeScope, onShare, onOpenHistory, onOpenMuscleRank, sharing }: RanksBannerProps) {
  return (
    <View className="gap-4 rounded-3xl border border-divider bg-surface p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-3 pr-3">
          <Text className="caption font-body-semibold text-text-secondary" style={{ letterSpacing: 1.5 }}>
            YOUR RANKS
          </Text>

          <Text style={bannerTitleStyle} className="text-brand-white">
            LIFT{"\n"}RANKS
          </Text>

          <View className="flex-row items-center gap-3">
            <RankBadge tier={tier} size={48} />
            <View>
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 28 }} className="text-text-primary">
                {power.toLocaleString("en-US")}
              </Text>
              <Text className="caption font-body-semibold text-text-secondary">
                POWER SCORE · {formatRankTier(tier).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View className="items-end gap-3">
          <View className="flex-row gap-2">
            <Pressable
              onPress={onOpenMuscleRank}
              hitSlop={8}
              style={PRESSED_STYLE}
              className="h-8 w-8 items-center justify-center rounded-full border border-divider"
            >
              <Ionicons name="body-outline" size={14} color={colors.neutral.textSecondary} />
            </Pressable>

            <Pressable
              onPress={onOpenHistory}
              hitSlop={8}
              style={PRESSED_STYLE}
              className="h-8 w-8 items-center justify-center rounded-full border border-divider"
            >
              <Ionicons name="time-outline" size={14} color={colors.neutral.textSecondary} />
            </Pressable>

            <Pressable
              onPress={onShare}
              disabled={sharing}
              hitSlop={8}
              style={PRESSED_STYLE}
              className="h-8 w-8 items-center justify-center rounded-full border border-divider"
            >
              <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={14} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 128, height: 128 * (205 / 250) }} />
        </View>
      </View>

      <View className="flex-row gap-2">
        {SCOPES.map(({ key, label }) => {
          const active = key === scope;
          return (
            <Pressable
              key={key}
              onPress={() => onChangeScope(key)}
              className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : "bg-background"}`}
            >
              <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const GRID_STAGGER_BASE_DELAY = 200;
const GRID_STAGGER_STEP = 35;

function LiftCard({
  card,
  width,
  index,
  editMode,
  scope,
  onPress,
  onRemove,
}: {
  card: DisplayLiftCard;
  width: number;
  index: number;
  editMode: boolean;
  scope: RankScope;
  onPress: () => void;
  onRemove: () => void;
}) {
  const tint = RANK_TIER_COLOR[card.tier];
  const percent = Math.round(card.percentileInTier * 100);
  const positivePr = (card.prDeltaKg ?? 0) >= 0;

  return (
    <Animated.View
      entering={FadeInUp.delay(GRID_STAGGER_BASE_DELAY + index * GRID_STAGGER_STEP)
        .springify()
        .damping(16)
        .mass(0.6)}
      style={{ width, height: GRID_TILE_HEIGHT }}
    >
      <Pressable
        onPress={editMode ? onRemove : onPress}
        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
        className={`gap-2 rounded-2xl border p-3 ${card.isWeakPoint ? "border-error bg-error/5" : "border-divider bg-surface"}`}
      >
        <View className="flex-row items-center justify-between">
          <RankBadge tier={card.tier} size={36} />
          {editMode ? (
            <View className="h-5 w-5 items-center justify-center rounded-full bg-error">
              <Ionicons name="close" size={13} color={colors.brand.white} />
            </View>
          ) : (
            card.isWeakPoint && <Ionicons name="warning" size={13} color={colors.semantic.error} />
          )}
        </View>

        <View className="gap-0.5">
          <Text className="caption font-body-bold" numberOfLines={1} style={{ color: tint }}>
            {formatRankTier(card.tier).toUpperCase()}
          </Text>
          <Text className="body-sm font-body-semibold text-text-primary" numberOfLines={1}>
            {card.name}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="barbell-outline" size={11} color={colors.neutral.textSecondary} />
            <Text className="caption text-text-secondary" numberOfLines={1}>
              {card.score.toLocaleString("en-US")}
            </Text>
          </View>
          <Text className="caption font-body-semibold text-text-primary" numberOfLines={1}>
            {scope === "gym" ? `#${card.gymRank}/${card.gymPoolSize}` : `${percent}%`}
          </Text>
        </View>

        <ProgressBar ratio={card.percentileInTier} color={tint} height={6} />

        {card.prDeltaKg !== null ? (
          <Text className="caption font-body-semibold" style={{ color: positivePr ? colors.semantic.success : colors.semantic.error }}>
            {positivePr ? "+" : ""}
            {card.prDeltaKg}kg PR
          </Text>
        ) : (
          <Text className="caption font-body-semibold text-text-secondary" numberOfLines={1}>
            {card.bestWeightKg > 0 ? `Best: ${card.bestWeightKg}kg` : "No PR logged yet"}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function AddLiftTile({ width, index, onPress }: { width: number; index: number; onPress: () => void }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(GRID_STAGGER_BASE_DELAY + index * GRID_STAGGER_STEP)
        .springify()
        .damping(16)
        .mass(0.6)}
      style={{ width, height: GRID_TILE_HEIGHT }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
        className="items-center justify-center gap-2 rounded-2xl border border-dashed border-divider bg-surface/40 p-3"
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.neutral.textSecondary} />
        <Text className="caption text-center font-body-semibold text-text-secondary">Add more</Text>
      </Pressable>
    </Animated.View>
  );
}

type SortMenuProps = {
  visible: boolean;
  sortKey: LiftCardSortKey;
  onChange: (key: LiftCardSortKey) => void;
  onClose: () => void;
};

function SortMenu({ visible, sortKey, onChange, onClose }: SortMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        {/* Swallows taps so they don't bubble to the backdrop Pressable and close the sheet. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).mass(0.7)}
            style={{ paddingBottom: insets.bottom + 16 }}
            className="gap-1 rounded-t-3xl border-t border-divider bg-surface p-4"
          >
            <Text className="heading-4 mb-2 text-text-primary">Sort lifts by</Text>
            {LIFT_CARD_SORT_OPTIONS.map((option) => {
              const active = option.key === sortKey;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onChange(option.key);
                    onClose();
                  }}
                  className="flex-row items-center justify-between rounded-xl px-2 py-3"
                >
                  <Text className={active ? "body-md font-body-semibold text-brand-yellow" : "body-md text-text-primary"}>{option.label}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.brand.yellow} />}
                </Pressable>
              );
            })}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function sortDisplayCards(cards: DisplayLiftCard[], sortKey: LiftCardSortKey): DisplayLiftCard[] {
  const sorted = [...cards];
  switch (sortKey) {
    case "strongest":
      return sorted.sort((a, b) => b.score - a.score);
    case "weakest":
      return sorted.sort((a, b) => a.score - b.score);
    case "recentPr":
      return sorted.sort((a, b) => (b.prDeltaKg ?? 0) - (a.prDeltaKg ?? 0));
    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function highestDisplayTier(cards: DisplayLiftCard[]): RankTier {
  return cards.reduce<RankTier>(
    (highest, card) => (RANK_TIERS.indexOf(card.tier) > RANK_TIERS.indexOf(highest) ? card.tier : highest),
    RANK_TIERS[0],
  );
}

export default function RanksScreen() {
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);

  const customExerciseIds = useTrackedLiftsStore((state) => state.customExerciseIds);
  const removedDefaultIds = useTrackedLiftsStore((state) => state.removedDefaultIds);
  const addCustomLift = useTrackedLiftsStore((state) => state.addCustomLift);
  const removeCustomLift = useTrackedLiftsStore((state) => state.removeCustomLift);
  const removeDefaultLift = useTrackedLiftsStore((state) => state.removeDefaultLift);
  const restoreDefaultLift = useTrackedLiftsStore((state) => state.restoreDefaultLift);

  const [scope, setScope] = useState<RankScope>("gym");
  const [sortKey, setSortKey] = useState<LiftCardSortKey>("strongest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Measured from the grid's own layout rather than the window width — the grid's parent already
  // carries the mx-4 side margins, so this is the exact width available for the 3 columns without
  // guessing at outer padding.
  const [gridWidth, setGridWidth] = useState(0);
  const bannerRef = useRef<View>(null);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const builtInCards = useMemo(() => buildLiftRankCards(records, profile, scope), [records, profile, scope]);

  const cards = useMemo<DisplayLiftCard[]>(() => {
    const defaults: DisplayLiftCard[] = builtInCards
      .filter((card) => !removedDefaultIds.includes(card.id))
      .map((card) => ({
        id: card.id,
        name: card.name,
        exerciseId: card.exerciseId,
        tier: card.tier,
        score: card.score,
        percentileInTier: card.percentileInTier,
        gymRank: card.gymRank,
        gymPoolSize: card.gymPoolSize,
        isWeakPoint: card.isWeakPoint,
        isCustom: false,
        bestWeightKg: card.bestWeightKg,
        prDeltaKg: card.prDeltaKg,
      }));

    const custom: DisplayLiftCard[] = customExerciseIds.flatMap((exerciseId) => {
      const exercise = EXERCISE_BY_ID[exerciseId];
      if (!exercise) return [];
      const bestWeightKg = records[exerciseId]?.bestWeightKg ?? 0;
      const bestReps = records[exerciseId]?.bestReps ?? 0;
      const detail = genericExerciseRankDetail(exercise, bestWeightKg, bestReps, profile);
      const score = Math.round((bestWeightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
      const tierIndex = RANK_TIERS.indexOf(detail.tier);
      const { percentileInTier, gymRank, gymPoolSize } = applyRankScope(exercise.id, tierIndex, detail.progressToNextTier, scope);
      return [
        {
          id: exercise.id,
          name: exercise.name,
          exerciseId: exercise.id,
          tier: detail.tier,
          score,
          percentileInTier,
          gymRank,
          gymPoolSize,
          isWeakPoint: false,
          isCustom: true,
          bestWeightKg,
          prDeltaKg: null,
        },
      ];
    });

    return [...defaults, ...custom];
  }, [builtInCards, customExerciseIds, removedDefaultIds, records, profile, scope]);

  const sortedCards = useMemo(() => sortDisplayCards(cards, sortKey), [cards, sortKey]);
  const power = cards.reduce((sum, card) => sum + card.score, 0);
  const topTier = highestDisplayTier(cards);
  const sortLabel = LIFT_CARD_SORT_OPTIONS.find((option) => option.key === sortKey)?.label ?? "Strongest";
  const cardWidth = gridWidth > 0 ? (gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS : 0;

  function handleGridLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== gridWidth) setGridWidth(width);
  }

  function handleCardPress(card: DisplayLiftCard) {
    router.push(`/ranks/${card.id}`);
  }

  function handleRemoveCard(card: DisplayLiftCard) {
    if (card.isCustom) removeCustomLift(card.exerciseId);
    else removeDefaultLift(card.id as LiftCardId);
  }

  function handleAddExercise(exercise: Exercise) {
    const matchingDefault = [...MAJOR_LIFT_CARDS, ...SEEDED_LIFT_CARDS].find((lift) => lift.exerciseId === exercise.id);
    if (matchingDefault) restoreDefaultLift(matchingDefault.id);
    else addCustomLift(exercise.id);
    setAddModalVisible(false);
  }

  function shareAsText() {
    // Share.share returns a rejected promise on web when the browser has no native share sheet —
    // .catch() it so that never surfaces as an unhandled rejection (see pr-celebration.tsx).
    Share.share({
      message: `My GymCrew power score is ${power.toLocaleString("en-US")} — ${formatRankTier(topTier)} tier 💪`,
    }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  async function handleShare() {
    if (sharing || !bannerRef.current) return;
    if (Platform.OS === "web") {
      shareAsText();
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(bannerRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        shareAsText();
      }
    } catch (error) {
      console.warn("Failed to capture rank banner screenshot, falling back to text share", error);
      shareAsText();
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="px-4 pt-4">
        <View ref={bannerRef} collapsable={false}>
          <RanksBanner
            power={power}
            tier={topTier}
            scope={scope}
            onChangeScope={setScope}
            onShare={handleShare}
            onOpenHistory={() => router.push("/ranks/history")}
            onOpenMuscleRank={() => router.push("/ranks/body-graph")}
            sharing={sharing}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(90).springify().damping(16).mass(0.6)}>
        <Pressable
          onPress={() => router.push("/ranks/whats-my-rank")}
          style={PRESSED_STYLE}
          className="mx-4 mt-4 flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
        >
          <Ionicons name="sparkles" size={18} color={colors.brand.iron} />
          <Text className="body-lg font-body-semibold text-brand-iron">What&apos;s my rank?</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).springify().damping(16).mass(0.6)} className="mx-4 mt-6 gap-3">
        <View className="flex-row items-center justify-between">
          <Text style={sectionHeaderStyle} className="text-brand-white">
            LIFTS
          </Text>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setSortMenuOpen(true)}
              style={PRESSED_STYLE}
              className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5"
            >
              <Text className="caption font-body-semibold text-text-secondary">Sort: {sortLabel}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => setEditMode((current) => !current)}
              style={PRESSED_STYLE}
              className={`rounded-full border px-3 py-1.5 ${editMode ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}
            >
              <Text className={`caption font-body-semibold ${editMode ? "text-brand-iron" : "text-text-secondary"}`}>
                {editMode ? "Done" : "Edit"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }} onLayout={handleGridLayout}>
          {cardWidth > 0 &&
            sortedCards.map((card, index) => (
              <LiftCard
                key={card.id}
                card={card}
                width={cardWidth}
                index={index}
                editMode={editMode}
                scope={scope}
                onPress={() => handleCardPress(card)}
                onRemove={() => handleRemoveCard(card)}
              />
            ))}
          {cardWidth > 0 && <AddLiftTile width={cardWidth} index={sortedCards.length} onPress={() => setAddModalVisible(true)} />}
        </View>
      </Animated.View>

      <SortMenu visible={sortMenuOpen} sortKey={sortKey} onChange={setSortKey} onClose={() => setSortMenuOpen(false)} />

      <ExercisePickerModal
        visible={addModalVisible}
        title="Add a Lift"
        subtitle="Track any exercise on your Ranks overview."
        onClose={() => setAddModalVisible(false)}
        onSelect={handleAddExercise}
        hideCreateRow
      />
    </ScrollView>
  );
}
