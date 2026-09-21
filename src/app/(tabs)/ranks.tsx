import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Share, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { usePostHog } from "posthog-react-native";
import { AttachStep } from "react-native-spotlight-tour";

import { ATTACH_INDEXES } from "@/components/AppTourOverlay";
import { EditableText } from "@/components/EditableText";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { ProgressBar } from "@/components/ProgressBar";
import { PromoBanners } from "@/components/PromoBanners";
import { RankBadge } from "@/components/RankBadge";
import { SnapshotBanner } from "@/components/SnapshotBanner";
import { images } from "@/constants/images";
import type { Exercise } from "@/data/exercises";
import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import { api, isApiConfigured, type RankStanding } from "@/lib/api";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { LIFT_CARD_SORT_OPTIONS, type LiftCardSortKey, type RankScope } from "@/lib/lift-rank-cards";
import { buildSnapshotRecords } from "@/lib/profile-snapshot";
import { ranksBoardCards, ranksBoardPowerScore, type DisplayLiftCard } from "@/lib/ranks-board";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { formatWeight } from "@/lib/units";
import type { WeightUnit } from "@/store/active-workout-store";
import { useDeveloperModeStore } from "@/store/developer-mode-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileSnapshotStore } from "@/store/profile-snapshot-store";
import { useTrackedLiftsStore } from "@/store/tracked-lifts-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

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
  /** Only passed when Developer Mode is on (see (tabs)/ranks.tsx's `isDeveloper` check) — omitting
   * it hides the button entirely rather than rendering it disabled. */
  onOpenBuildYourGraph?: () => void;
  sharing: boolean;
};

function RanksBanner({ power, tier, scope, onChangeScope, onShare, onOpenHistory, onOpenMuscleRank, onOpenBuildYourGraph, sharing }: RanksBannerProps) {
  return (
    <AttachStep index={ATTACH_INDEXES.ranks} fill>
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
              <EditableText
                id="ranks.hero.powerScore"
                style={{ fontFamily: fontFamily.heading, fontSize: 26, lineHeight: 28 }}
                className="text-text-primary"
              >
                {power.toLocaleString("en-US")}
              </EditableText>
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

            {onOpenBuildYourGraph && (
              <Pressable
                onPress={onOpenBuildYourGraph}
                hitSlop={8}
                style={PRESSED_STYLE}
                className="h-8 w-8 items-center justify-center rounded-full border border-brand-yellow"
              >
                <Ionicons name="color-palette-outline" size={14} color={colors.brand.yellow} />
              </Pressable>
            )}

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
    </AttachStep>
  );
}

const GRID_STAGGER_BASE_DELAY = 200;
const GRID_STAGGER_STEP = 35;

function LiftCard({ card, width, index, editMode, scope, weightUnit, onPress, onRemove }: { card: DisplayLiftCard; width: number; index: number; editMode: boolean; scope: RankScope; weightUnit: WeightUnit; onPress: () => void; onRemove: () => void }) {
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
          <EditableText id={`ranks.lift.${card.id}.tier`} className="caption font-body-bold" style={{ color: tint }} numberOfLines={1}>
            {formatRankTier(card.tier).toUpperCase()}
          </EditableText>
          <EditableText id={`ranks.lift.${card.id}.name`} className="body-sm font-body-semibold text-text-primary" numberOfLines={1}>
            {card.name}
          </EditableText>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Ionicons name="barbell-outline" size={11} color={colors.neutral.textSecondary} />
            <EditableText id={`ranks.lift.${card.id}.score`} className="caption text-text-secondary" numberOfLines={1}>
              {card.score.toLocaleString("en-US")}
            </EditableText>
          </View>
          <EditableText id={`ranks.lift.${card.id}.percentile`} className="caption font-body-semibold text-text-primary" numberOfLines={1}>
            {scope === "gym" ? (card.gymRank !== null && card.gymPoolSize !== null ? `#${card.gymRank}/${card.gymPoolSize}` : "Not ranked yet") : `${percent}%`}
          </EditableText>
        </View>

        <ProgressBar ratio={card.percentileInTier} color={tint} height={6} />

        {card.prDeltaKg !== null ? (
          <EditableText
            id={`ranks.lift.${card.id}.prDelta`}
            className="caption font-body-semibold"
            style={{
              color: positivePr ? colors.semantic.success : colors.semantic.error,
            }}
          >
            {`${positivePr ? "+" : ""}${formatWeight(card.prDeltaKg, weightUnit)} PR`}
          </EditableText>
        ) : (
          <EditableText id={`ranks.lift.${card.id}.best`} className="caption font-body-semibold text-text-secondary" numberOfLines={1}>
            {card.bestWeightKg > 0 ? `Best: ${formatWeight(card.bestWeightKg, weightUnit)}` : "No PR logged yet"}
          </EditableText>
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
  const weightUnit = useOnboardingStore((state) => state.weightUnit);
  const liveRecords = usePersonalRecordsStore((state) => state.records);
  const workouts = useWorkoutHistoryStore((state) => state.workouts);
  const snapshotAsOfMs = useProfileSnapshotStore((state) => state.asOfMs);
  const snapshotWeightKg = useProfileSnapshotStore((state) => state.weightKg);
  const clearSnapshot = useProfileSnapshotStore((state) => state.clearSnapshot);
  const developerModeEnabled = useDeveloperModeStore((state) => state.enabled);

  const records = useMemo(
    () => (snapshotAsOfMs != null ? buildSnapshotRecords(workouts.filter((workout) => workout.completedAt <= snapshotAsOfMs)) : liveRecords),
    [snapshotAsOfMs, workouts, liveRecords],
  );

  const customExerciseIds = useTrackedLiftsStore((state) => state.customExerciseIds);
  const removedDefaultIds = useTrackedLiftsStore((state) => state.removedDefaultIds);
  const hiddenAchievementIds = useTrackedLiftsStore((state) => state.hiddenAchievementIds);
  const addCustomLift = useTrackedLiftsStore((state) => state.addCustomLift);
  const removeCustomLift = useTrackedLiftsStore((state) => state.removeCustomLift);
  const removeDefaultLift = useTrackedLiftsStore((state) => state.removeDefaultLift);
  const restoreDefaultLift = useTrackedLiftsStore((state) => state.restoreDefaultLift);
  const hideAchievement = useTrackedLiftsStore((state) => state.hideAchievement);
  const unhideAchievement = useTrackedLiftsStore((state) => state.unhideAchievement);

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
  const posthog = usePostHog();

  const profile: RankProfile = useMemo(
    () => ({ gender, bodyWeightKg: snapshotAsOfMs != null && snapshotWeightKg != null ? snapshotWeightKg : weightKg, age }),
    [gender, weightKg, age, snapshotAsOfMs, snapshotWeightKg],
  );

  // Real "where do you stand at your own gym" per lift (see backend/routes/rank-standings.php) —
  // fetched once per set of achieved exercises rather than per-render; stays `{}` (every card falls
  // back to its own honest "Not ranked yet" state) until this resolves or if there's no backend.
  const [gymStandings, setGymStandings] = useState<Record<string, RankStanding | null>>({});
  const exerciseIdsKey = useMemo(() => Object.keys(records).sort().join(","), [records]);
  useEffect(() => {
    if (!isApiConfigured || snapshotAsOfMs != null || !exerciseIdsKey) return;
    api
      .getRankStandings(exerciseIdsKey.split(","))
      .then(setGymStandings)
      .catch((error) => console.warn("Failed to load real gym rank standings", error));
  }, [exerciseIdsKey, snapshotAsOfMs]);

  // Auto-curated: every exercise with a real record, best-rank-first, capped at 12 — a better
  // achievement always bumps a worse one out automatically. `customExerciseIds` pins tiles beyond
  // that (shown even with no record yet); `removedDefaultIds`/`hiddenAchievementIds` keep something
  // out regardless of rank. See lib/ranks-board.ts — the single source of truth for this board, also
  // used anywhere else "Overall Power" needs to match what's shown here.
  const cards = useMemo<DisplayLiftCard[]>(
    () => ranksBoardCards(records, profile, scope, removedDefaultIds, hiddenAchievementIds, customExerciseIds, gymStandings),
    [records, profile, scope, removedDefaultIds, hiddenAchievementIds, customExerciseIds, gymStandings],
  );

  const sortedCards = useMemo(() => sortDisplayCards(cards, sortKey), [cards, sortKey]);
  const power = ranksBoardPowerScore(cards);
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
    if (!card.isCustom) {
      removeDefaultLift(card.id as LiftCardId);
      return;
    }
    // Unpin (no-op if it was never pinned) and hide — otherwise a strong auto-curated achievement
    // would just reappear in the top 12 immediately after "removing" it.
    removeCustomLift(card.exerciseId);
    hideAchievement(card.exerciseId);
  }

  function handleAddExercise(exercise: Exercise) {
    const matchingDefault = [...MAJOR_LIFT_CARDS, ...SEEDED_LIFT_CARDS].find((lift) => lift.exerciseId === exercise.id);
    if (matchingDefault) restoreDefaultLift(matchingDefault.id);
    else addCustomLift(exercise.id);
    unhideAchievement(exercise.id);
    posthog.capture("rank_lift_tracked", { exerciseId: exercise.id });
    setAddModalVisible(false);
  }

  function shareAsText() {
    // Share.share returns a rejected promise on web when the browser has no native share sheet —
    // .catch() it so that never surfaces as an unhandled rejection (see pr-celebration.tsx).
    Share.share({
      message: `My GymCrew power score is ${power.toLocaleString("en-US")} — ${formatRankTier(topTier)} tier 💪`,
    })
      .then(() => posthog.capture("rank_shared"))
      .catch((error) => console.warn("Sharing is unavailable on this platform", error));
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
        posthog.capture("rank_shared");
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
    <View className="flex-1 bg-background">
      {snapshotAsOfMs != null && snapshotWeightKg != null && (
        <SnapshotBanner asOfMs={snapshotAsOfMs} weightKg={snapshotWeightKg} weightUnit={weightUnit} onExit={clearSnapshot} />
      )}
      <ScrollView className="flex-1" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
        <PromoBanners placement="ranks" />
        <Animated.View entering={FadeInUp.springify().damping(16).mass(0.6)} className="px-4 pt-4">
          <View ref={bannerRef} collapsable={false}>
            <RanksBanner power={power} tier={topTier} scope={scope} onChangeScope={setScope} onShare={handleShare} onOpenHistory={() => router.push("/ranks/history")} onOpenMuscleRank={() => router.push("/ranks/body-graph")} onOpenBuildYourGraph={developerModeEnabled ? () => router.push("/ranks/build-your-graph") : undefined} sharing={sharing} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(90).springify().damping(16).mass(0.6)}>
          <Pressable onPress={() => router.push("/ranks/whats-my-rank")} style={PRESSED_STYLE} className="mx-4 mt-4 flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4">
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
              <Pressable onPress={() => setSortMenuOpen(true)} style={PRESSED_STYLE} className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-3 py-1.5">
                <Text className="caption font-body-semibold text-text-secondary">Sort: {sortLabel}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.neutral.textSecondary} />
              </Pressable>

              {snapshotAsOfMs == null && (
                <Pressable onPress={() => setEditMode((current) => !current)} style={PRESSED_STYLE} className={`rounded-full border px-3 py-1.5 ${editMode ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"}`}>
                  <Text className={`caption font-body-semibold ${editMode ? "text-brand-iron" : "text-text-secondary"}`}>{editMode ? "Done" : "Edit"}</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }} onLayout={handleGridLayout}>
            {cardWidth > 0 && sortedCards.map((card, index) => <LiftCard key={card.id} card={card} width={cardWidth} index={index} editMode={editMode} scope={scope} weightUnit={weightUnit} onPress={() => handleCardPress(card)} onRemove={() => handleRemoveCard(card)} />)}
            {cardWidth > 0 && snapshotAsOfMs == null && <AddLiftTile width={cardWidth} index={sortedCards.length} onPress={() => setAddModalVisible(true)} />}
          </View>
        </Animated.View>

        <SortMenu visible={sortMenuOpen} sortKey={sortKey} onChange={setSortKey} onClose={() => setSortMenuOpen(false)} />

        <ExercisePickerModal visible={addModalVisible} title="Add a Lift" subtitle="Track any exercise on your Ranks overview." onClose={() => setAddModalVisible(false)} onSelect={handleAddExercise} hideCreateRow renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, cards, records, profile)} size={34} />} />
      </ScrollView>
    </View>
  );
}
