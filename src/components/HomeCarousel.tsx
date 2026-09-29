import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import { AddGoalModal } from "@/components/AddGoalModal";
import { AiChromaButton } from "@/components/AiChromaButton";
import { BottomSheet } from "@/components/BottomSheet";
import { GoalDetailModal } from "@/components/GoalDetailModal";
import { HOME_BADGE_RADIUS, HOME_BADGE_SIZE } from "@/components/homeStyle";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { EditableNumberFlow } from "@/components/EditableAnimated";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { TiltCarousel } from "@/components/ui/molecules/tilt-carousel";
import { RankBadge } from "@/components/RankBadge";
import type { WorkoutSession } from "@/data/workout-log";
import { useGoalProgress } from "@/hooks/use-goal-progress";
import { useTodayNutrition } from "@/hooks/use-today-nutrition";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { getCurrentWeekDates, toDateKey } from "@/lib/date";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { mergeMuscleIntensity } from "@/lib/muscle-intensity";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { formatRankTier, type RankProfile } from "@/lib/rank";
import { formatWeight } from "@/lib/units";
import type { Gender } from "@/store/onboarding-store";
import { useGoalsStore } from "@/store/goals-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

const ITEM_WIDTH = 250;
const ITEM_HEIGHT = 320;

type CardId = "stats" | "nutrition" | "rank" | "goals";

/** The shell every card in the deck shares — flat `colors.neutral.surface` fill on every card.
 * Content stacks top-down with a fixed gap instead of `justify-between` — spreading 2-3 rows evenly
 * across the whole fixed card height is what read as "too much empty space" (it spaces the CONTENT
 * apart, not just trails after it); any leftover height falls as one trailing gap under real content,
 * absorbed by each card's own `flex-1` content block. */
function CarouselCard({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) {
  const content = (
    <View style={{ flex: 1, borderRadius: 26, backgroundColor: colors.neutral.surface, padding: 18 }} className="gap-3">
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

function CardLabel({ children }: { children: string }) {
  return <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.neutral.textSecondary }}>{children}</Text>;
}

function StatsCard({ workouts, gender, streak }: { workouts: CompletedWorkout[]; gender: Gender; streak: number }) {
  const trainedDays = useMemo(() => {
    const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
    const trainedKeys = new Set(
      workouts.filter((workout) => !workout.isBackfilled && weekKeys.has(toDateKey(new Date(workout.completedAt)))).map((workout) => toDateKey(new Date(workout.completedAt))),
    );
    return trainedKeys.size;
  }, [workouts]);
  const intensity = useMemo(() => {
    const weekKeys = new Set(getCurrentWeekDates(new Date()).map(toDateKey));
    return mergeMuscleIntensity(workouts.filter((workout) => !workout.isBackfilled && weekKeys.has(toDateKey(new Date(workout.completedAt)))));
  }, [workouts]);

  return (
    <CarouselCard onPress={() => router.push("/workout/history")}>
      <View className="flex-row items-start justify-between">
        <View>
          <NumberFlow value={trainedDays} fontSize={32} color={colors.brand.yellow} fontWeight="800" />
          <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.neutral.textSecondary }}>WORKOUTS</Text>
        </View>
        <View className="items-end">
          <NumberFlow value={streak} fontSize={32} color={colors.brand.yellow} fontWeight="800" />
          <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.neutral.textSecondary }}>STREAK</Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center">
        <MuscleHeatmap muscleIntensity={intensity} height={166} view="front" showLegend={false} showViewLabel={false} gender={gender} />
      </View>
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>This week&apos;s muscle map · tap for history</Text>
    </CarouselCard>
  );
}

/** One macro as its own small animated ring (Reacticx `circular-progress`) — the same language
 * Nutrition's own diary/progress screens already use for macros (`DiaryRings`, `AiScanMacroRing`), so
 * this card reads as "the Nutrition system, glanced at from Home" instead of inventing a third way to
 * show a percentage next to the bars this card used to use. */
function MacroRing({ label, percent, grams, color }: { label: string; percent: number; grams: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(100, percent), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [percent, progress]);

  return (
    <View className="items-center gap-1.5">
      <CircularProgress
        progress={progress}
        size={54}
        strokeWidth={5}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={color}
        backgroundColor={colors.neutral.surfaceElevated}
        renderIcon={() => <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.brand.white }}>{Math.round(grams)}g</Text>}
      />
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 0.5, color: colors.neutral.textSecondary }}>{label}</Text>
    </View>
  );
}

function NutritionCard() {
  const nutrition = useTodayNutrition();

  if (!nutrition.hasTargets) {
    return (
      <CarouselCard onPress={() => router.push("/nutrition")}>
        <View className="flex-row items-center justify-between">
          <CardLabel>NUTRITION</CardLabel>
          <AiChromaButton size={30} onPress={() => router.push("/nutrition/scan-meal")} />
        </View>
        <View style={{ width: HOME_BADGE_SIZE, height: HOME_BADGE_SIZE, borderRadius: HOME_BADGE_RADIUS, backgroundColor: colors.brand.yellow }} className="items-center justify-center">
          <Ionicons name="restaurant" size={20} color={colors.brand.iron} />
        </View>
        <View className="flex-1 justify-center">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 24, color: colors.brand.white }}>TRACK FOOD</Text>
        </View>
      </CarouselCard>
    );
  }

  const remaining = Math.max(0, Math.round(nutrition.calorieTarget - nutrition.totals.calories));
  return (
    <CarouselCard onPress={() => router.push("/nutrition")}>
      <View className="flex-row items-center justify-between">
        <CardLabel>TODAY&apos;S FUEL</CardLabel>
        <AiChromaButton size={30} onPress={() => router.push("/nutrition/scan-meal")} />
      </View>
      <View className="flex-1 items-center justify-center gap-4">
        <EditableNumberFlow id="home.nutrition.calories" value={remaining} fontSize={30} suffix="kcal left" />
        <View className="flex-row gap-4">
          <MacroRing label="PROTEIN" percent={nutrition.proteinPercent} grams={nutrition.totals.proteinG} color={NUTRITION_COLORS.protein} />
          <MacroRing label="CARBS" percent={nutrition.carbsPercent} grams={nutrition.totals.carbsG} color={NUTRITION_COLORS.carbs} />
          <MacroRing label="FAT" percent={nutrition.fatPercent} grams={nutrition.totals.fatG} color={NUTRITION_COLORS.fat} />
        </View>
      </View>
    </CarouselCard>
  );
}

/** Your rank, front and center — Rank is a headline feature of the whole app (see AGENTS.md's project
 * overview) but had no presence anywhere on Home until round 3.
 *
 * Round 4: which lift this shows is now a real choice, not just whichever scores highest ("ik wil zelf
 * kiezen over welke exercise het gaat"). The small header button opens a Reacticx `BottomSheet` listing
 * every tracked lift (12 of them — too many for the arc-menu picker the volume chart uses, which
 * AGENTS.md already notes only suits "a handful of small, similarly-sized icons"). The choice is
 * session-only state (`useState`, not persisted) — the same precedent `HomeStrengthTrend`'s own metric
 * picker set, so a fresh app open just falls back to your best lift.
 *
 * Round 6: three fixes. (1) "wil ik niet de gouden cirkel eromheen hebben" — `ChromaFrame` is gone;
 * the badge sits plain, bigger, no frame. (2) "de card mag iets beter gevuld worden" — added a real
 * progress bar for `percentileInTier` and how many kg stand between here and the next tier
 * (`kgToNextTier`), both already computed by `buildLiftRankCards` and previously thrown away — this
 * wasn't a restyle looking for more content, the content was already there, just unused. (3) "als ik
 * er een andere oefening wil kiezen kan ik niet naar beneden scrollen in de dropdown" — the picker used
 * `maxDynamicContentSize` (auto-size-then-scroll-past-cap), which doesn't reliably coexist with a
 * `BottomSheetScrollView` child on web; switched to fixed `snapPoints` instead, the same setup
 * `DayWorkoutsSheet` already uses successfully for its own scrollable list — a proven pairing rather
 * than debugging the dynamic-sizing path further. */
function RankCard() {
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const weightUnit = useWeightUnit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);
  const best = useMemo(() => (cards.length > 0 ? [...cards].sort((a, b) => b.score - a.score)[0] : null), [cards]);
  const active = (selectedId && cards.find((card) => card.id === selectedId)) || best;

  if (!active) {
    return (
      <CarouselCard onPress={() => router.push("/ranks")}>
        <CardLabel>YOUR RANK</CardLabel>
        <View style={{ width: HOME_BADGE_SIZE, height: HOME_BADGE_SIZE, borderRadius: HOME_BADGE_RADIUS, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
          <Ionicons name="trophy" size={20} color={colors.brand.yellow} />
        </View>
        <View className="flex-1 justify-center gap-0.5">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, color: colors.brand.white }}>NO RANK YET</Text>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 13, letterSpacing: 1, color: colors.brand.yellow }}>LOG A LIFT ›</Text>
        </View>
      </CarouselCard>
    );
  }

  return (
    <CarouselCard onPress={() => router.push("/ranks")}>
      <View className="flex-row items-center justify-between">
        <CardLabel>YOUR RANK</CardLabel>
        <Pressable onPress={() => setPickerOpen(true)} hitSlop={8} accessibilityLabel="Choose a lift" style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral.surfaceElevated }} className="items-center justify-center">
          <Ionicons name="swap-horizontal" size={14} color={colors.brand.yellow} />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center gap-2">
        <RankBadge tier={active.tier} size={72} />
        <View className="items-center gap-0.5">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, color: colors.brand.white }} numberOfLines={1}>
            {active.name.toUpperCase()}
          </Text>
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.neutral.textSecondary }}>{formatRankTier(active.tier)}</Text>
        </View>
        <View style={{ width: "100%" }} className="gap-1">
          <AnimatedProgressBar progress={active.percentileInTier} height={5} borderRadius={3} progressColor={colors.brand.yellow} trackColor={colors.neutral.divider} animationDuration={800} />
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.neutral.textSecondary, textAlign: "center" }}>
            {active.kgToNextTier !== null ? `${formatWeight(active.kgToNextTier, weightUnit)} to next tier` : "Top tier reached"}
          </Text>
        </View>
      </View>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} snapPoints={["55%", "85%"]}>
        <View className="px-5 pb-2 pt-1">
          <Text className="body-sm text-text-secondary">Choose a lift</Text>
        </View>
        <BottomSheetScrollView className="px-5" showsVerticalScrollIndicator={false}>
          {cards.map((card) => {
            const isActive = card.id === active.id;
            return (
              <Pressable
                key={card.id}
                onPress={() => {
                  setSelectedId(card.id);
                  setPickerOpen(false);
                }}
                className="flex-row items-center gap-3 border-b border-divider py-3"
              >
                <RankBadge tier={card.tier} size={32} />
                <View className="flex-1">
                  <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.brand.white }}>{card.name}</Text>
                  <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>{formatRankTier(card.tier)}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.brand.yellow} />}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheet>
    </CarouselCard>
  );
}

/** `CircularProgress` always wraps itself in its own internal `Pressable` (with whatever `onPress` it's
 * given, or none) — nesting it inside ANOTHER `Pressable` meant the inner one silently claimed the
 * touch responder for anything landing on the ring itself (RN grants responder to the innermost
 * `Pressable` under the touch first), so tapping the ring — the obvious, biggest tap target — did
 * nothing; only the label text below it, outside the ring's own bounds, actually worked. That's why
 * "ik moet op een goal kunnen drukken om te editen dat kan nu niet" was real: most people tap the ring,
 * not the small text under it. Fixed by giving `CircularProgress` the `onPress` directly (its own
 * supported prop) and wrapping the label in its own separate, sibling `Pressable` instead of nesting
 * one Pressable inside another. */
function GoalRing({ goal, sessions, onPress }: { goal: ReturnType<typeof useGoalsStore.getState>["goals"][number]; sessions: Record<string, WorkoutSession>; onPress: () => void }) {
  const { ratio } = useGoalProgress(goal, sessions);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(100, ratio * 100), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  return (
    <View className="items-center gap-1.5" style={{ width: 92 }}>
      <CircularProgress
        progress={progress}
        size={62}
        strokeWidth={6}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={goal.color}
        backgroundColor={colors.neutral.surfaceElevated}
        onPress={onPress}
        renderIcon={() => <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.brand.white }}>{`${Math.round(ratio * 100)}%`}</Text>}
      />
      <Pressable onPress={onPress} hitSlop={4}>
        <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.neutral.textSecondary, width: 92, textAlign: "center" }} numberOfLines={1}>
          {goal.label}
        </Text>
      </Pressable>
    </View>
  );
}

const GOALS_PER_PAGE = 4;

/** Goals as a small ring grid (Reacticx `circular-progress`, one per goal) instead of a stacked list
 * of linear bars — glanceable at a card's size, and each ring still opens its own `GoalDetailModal` on
 * tap; "+" still opens `AddGoalModal`. Paged 4 at a time with prev/next arrows once there are more than
 * one page ("als er meer dan 4 goals zijn je ze wel kan benaderen") — a fixed-size deck card can't just
 * grow taller for a 5th goal the way a full-width section could. */
function GoalsCard({ sessions }: { sessions: Record<string, WorkoutSession> }) {
  const goals = useGoalsStore((state) => state.goals);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [page, setPage] = useState(0);
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;

  const pageCount = Math.max(1, Math.ceil(goals.length / GOALS_PER_PAGE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageGoals = goals.slice(clampedPage * GOALS_PER_PAGE, clampedPage * GOALS_PER_PAGE + GOALS_PER_PAGE);

  return (
    <CarouselCard>
      <View className="flex-row items-center justify-between">
        <CardLabel>YOUR GOALS</CardLabel>
        <Pressable onPress={() => setAddModalVisible(true)} hitSlop={8} accessibilityLabel="New goal">
          <Ionicons name="add-circle" size={22} color={colors.brand.yellow} />
        </Pressable>
      </View>
      <View className="flex-1 flex-row flex-wrap items-center justify-center gap-3">
        {goals.length === 0 ? (
          <Pressable onPress={() => setAddModalVisible(true)}>
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary, textAlign: "center" }}>No goals yet — tap + to add one.</Text>
          </Pressable>
        ) : (
          pageGoals.map((goal) => <GoalRing key={goal.id} goal={goal} sessions={sessions} onPress={() => setSelectedGoalId(goal.id)} />)
        )}
      </View>

      {pageCount > 1 && (
        <View className="flex-row items-center justify-center gap-4">
          <Pressable onPress={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0} hitSlop={8} accessibilityLabel="Previous goals">
            <Ionicons name="chevron-back" size={18} color={clampedPage === 0 ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 12, color: colors.neutral.textSecondary }}>{`${clampedPage + 1}/${pageCount}`}</Text>
          <Pressable onPress={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={clampedPage === pageCount - 1} hitSlop={8} accessibilityLabel="More goals">
            <Ionicons name="chevron-forward" size={18} color={clampedPage === pageCount - 1 ? colors.neutral.divider : colors.neutral.textSecondary} />
          </Pressable>
        </View>
      )}

      <GoalDetailModal visible={selectedGoal !== null} goal={selectedGoal} sessions={sessions} onClose={() => setSelectedGoalId(null)} />
      <AddGoalModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} />
    </CarouselCard>
  );
}

type HomeCarouselProps = {
  workouts: CompletedWorkout[];
  gender: Gender;
  streak: number;
  sessions: Record<string, WorkoutSession>;
};

/** Home v5, round 3: a smaller, more curated deck (Reacticx `tilt-carousel`) — Crew War, Train This
 * Next and Last Workout came back out ("kan eruit dat kunnen mensen ook anders zien" — Crew War lives
 * on the Crew tab, Last Workout in History, and Train This Next's own suggestion is still reachable
 * from the Log tab's Smart Split entry point; repeating all of it here just diluted the deck). Four
 * cards now: Stats, Nutrition, **Rank** (new — a genuinely unrepresented core feature, see `RankCard`'s
 * own comment), Goals. Nutrition and Goals both moved onto Reacticx `circular-progress` rings instead
 * of flat badges + linear bars — denser, more glanceable, and reusing a shape this app's own Nutrition
 * screens already use for macros rather than a bespoke fourth way to draw a percentage. */
export function HomeCarousel({ workouts, gender, streak, sessions }: HomeCarouselProps) {
  const cards: CardId[] = ["stats", "nutrition", "rank", "goals"];

  return (
    <TiltCarousel
      data={cards}
      keyExtractor={(id) => id}
      itemWidth={ITEM_WIDTH}
      itemHeight={ITEM_HEIGHT}
      marginHorizontal={10}
      rotationAngle={14}
      translateYValue={26}
      renderItem={({ item }) => {
        if (item === "stats") return <StatsCard workouts={workouts} gender={gender} streak={streak} />;
        if (item === "nutrition") return <NutritionCard />;
        if (item === "rank") return <RankCard />;
        return <GoalsCard sessions={sessions} />;
      }}
    />
  );
}
