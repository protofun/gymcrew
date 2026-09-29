import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { usePostHog } from "posthog-react-native";

import { goBack } from "@/lib/navigation";
import { DatePickerModal } from "@/components/DatePickerModal";
import { ExerciseInstructionsModal } from "@/components/ExerciseInstructionsModal";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { buildNumberRange, NumberArcPickerModal } from "@/components/NumberArcPickerModal";
import { RankBadge } from "@/components/RankBadge";
import { RankUpReveal } from "@/components/RankUpReveal";
import { TierPickerSheet } from "@/components/TierPickerSheet";
import type { Exercise } from "@/data/exercises";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { genericExerciseRankDetail, tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards, type LiftRankCard } from "@/lib/lift-rank-cards";
import { checkLiftPlausibility, type PlausibilityResult } from "@/lib/rank-plausibility";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import {
  rankForHypotheticalWeight,
  simulateRankProgression,
  weeksNeededForGoal,
  weightNeededForTier,
  type HypotheticalRankResult,
  type SimulationPoint,
} from "@/lib/rank-simulator";
import { shareViewAsImage } from "@/lib/share-image";
import { displayWeight, formatWeight, lbsToKg } from "@/lib/units";
import { ensureExerciseTrackedOnRanksBoard } from "@/lib/workout-finish";
import { estimateOneRepMax } from "@/lib/workout-metrics";
import type { WeightUnit } from "@/store/active-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { colors, fontFamily } from "@/theme";

type Step = "pick" | "log" | "reveal" | "simulator";
type Decision = "pending" | "logged" | "viewOnly";
/** Bound for the custom date picker only (it needs some calendar limit to stop scrolling at) —
 * there's no realistic-timeline cap anymore, this is just generously far out. */
const CUSTOM_DATE_MAX_WEEKS = 156;

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.75 : 1 });

const subHeaderStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 18,
  lineHeight: 20,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const headerTitleStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

/**
 * Any exercise picked in the wizard, not just the 9 tracked lifts — `knownCard` is set for those 9
 * (so rank math uses the precise major-lift formula or the seeded-lift estimate) and left `null`
 * otherwise, falling back to `genericExerciseRankDetail`'s muscle-group proxy.
 */
type WizardLift = {
  exercise: Exercise;
  name: string;
  tier: LiftRankCard["tier"];
  percentileInTier: number;
  bestWeightKg: number;
  bestReps: number;
  knownCard: LiftRankCard | null;
};

function buildWizardLift(exercise: Exercise, cards: LiftRankCard[], records: Record<string, PersonalRecord>, profile: RankProfile): WizardLift {
  const knownCard = cards.find((card) => card.exerciseId === exercise.id) ?? null;
  if (knownCard) {
    return {
      exercise,
      name: knownCard.name,
      tier: knownCard.tier,
      percentileInTier: knownCard.percentileInTier,
      bestWeightKg: knownCard.bestWeightKg,
      bestReps: knownCard.bestReps,
      knownCard,
    };
  }

  const record = records[exercise.id];
  const bestWeightKg = record?.bestWeightKg ?? 0;
  const bestReps = record?.bestReps ?? 0;
  const detail = genericExerciseRankDetail(exercise, bestWeightKg, bestReps, profile);
  return { exercise, name: exercise.name, tier: detail.tier, percentileInTier: detail.progressToNextTier, bestWeightKg, bestReps, knownCard: null };
}

function rankAtWeight(lift: WizardLift, weightKg: number, reps: number, profile: RankProfile): HypotheticalRankResult {
  if (lift.knownCard) return rankForHypotheticalWeight(lift.knownCard, weightKg, profile);
  return genericExerciseRankDetail(lift.exercise, weightKg, reps, profile);
}

function LogStep({
  lift,
  weightUnit,
  onSubmit,
  onInfo,
}: {
  lift: WizardLift;
  weightUnit: WeightUnit;
  onSubmit: (weightKg: number, reps: number) => void;
  onInfo: () => void;
}) {
  // Bodyweight exercises (crunches, planks, ...) are legitimately 0kg — default that field to "0"
  // instead of blank so it doesn't read as "not filled in yet".
  const isBodyweight = lift.exercise.equipment === "body only";
  const [weightInput, setWeightInput] = useState(
    lift.bestWeightKg > 0 ? String(displayWeight(lift.bestWeightKg, weightUnit)) : isBodyweight ? "0" : "",
  );
  const [repsInput, setRepsInput] = useState(lift.bestReps > 0 ? String(lift.bestReps) : "");

  // Tapping either field opens the same Reacticx `arc-list` wheel picker `ExerciseSetRow` uses for
  // logging a set mid-workout ("hier met whats my rank... de arc fan gebruiken net als bij het
  // loggen van een exercise") — one shared component (`NumberArcPickerModal`), not a second
  // lookalike. Typing directly is still fully available via each picker's own "Type manually" row.
  const [weightPickerOpen, setWeightPickerOpen] = useState(false);
  const [weightEditing, setWeightEditing] = useState(false);
  const [weightRangeBase, setWeightRangeBase] = useState<number | null>(null);
  const weightInputRef = useRef<TextInput>(null);
  const [repsPickerOpen, setRepsPickerOpen] = useState(false);
  const [repsEditing, setRepsEditing] = useState(false);
  const [repsRangeBase, setRepsRangeBase] = useState<number | null>(null);
  const repsInputRef = useRef<TextInput>(null);

  const weightValues = useMemo(() => buildNumberRange(weightRangeBase ?? 60, 40, 60), [weightRangeBase]);
  const weightIndex = Math.max(0, weightValues.indexOf(Math.round(weightRangeBase ?? 60)));
  const repsValues = useMemo(() => buildNumberRange(repsRangeBase ?? 8, 8, 20), [repsRangeBase]);
  const repsIndex = Math.max(0, repsValues.indexOf(Math.round(repsRangeBase ?? 8)));

  function openWeightPicker() {
    const current = parseFloat(weightInput.replace(",", "."));
    setWeightRangeBase(Number.isFinite(current) ? current : 60);
    setWeightPickerOpen(true);
  }

  function openRepsPicker() {
    const current = parseInt(repsInput, 10);
    setRepsRangeBase(Number.isFinite(current) ? current : 8);
    setRepsPickerOpen(true);
  }

  // Blank still parses to NaN (invalid) — only an explicit "0" (or the bodyweight default above)
  // counts as a real zero-weight entry. Entered in the user's chosen unit; converted to kg (the
  // canonical storage unit) before it ever reaches rank math or `onSubmit`.
  const enteredWeight = parseFloat(weightInput.replace(",", "."));
  const weightKg = Number.isFinite(enteredWeight) ? (weightUnit === "lbs" ? lbsToKg(enteredWeight) : enteredWeight) : NaN;
  const reps = parseInt(repsInput, 10);
  const validInput = Number.isFinite(weightKg) && weightKg >= 0 && Number.isFinite(reps) && reps > 0;
  const estimated1RM = validInput ? displayWeight(estimateOneRepMax(weightKg, reps), weightUnit) : null;

  return (
    <View className="gap-5 px-4 pt-4">
      <View className="flex-row items-center gap-3">
        <RankBadge tier={lift.tier} size={44} />
        <View className="flex-1">
          <Text style={subHeaderStyle} className="text-text-primary" numberOfLines={1}>
            {lift.name}
          </Text>
          <Text className="caption text-text-secondary">Log one set — weight and reps.</Text>
        </View>
        <Pressable onPress={onInfo} hitSlop={8} className="p-1">
          <Ionicons name="information-circle-outline" size={20} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="caption font-body-semibold text-text-secondary">WEIGHT ({weightUnit.toUpperCase()})</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              ref={weightInputRef}
              value={weightInput}
              onChangeText={setWeightInput}
              onBlur={() => setWeightEditing(false)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.neutral.textSecondary}
              style={{ backgroundColor: colors.neutral.surfaceElevated, borderRadius: 16 }}
              className="heading-4 px-4 py-3 text-text-primary"
            />
            {!weightEditing && <Pressable onPress={openWeightPicker} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
          </View>
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="caption font-body-semibold text-text-secondary">REPS</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              ref={repsInputRef}
              value={repsInput}
              onChangeText={setRepsInput}
              onBlur={() => setRepsEditing(false)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.neutral.textSecondary}
              style={{ backgroundColor: colors.neutral.surfaceElevated, borderRadius: 16 }}
              className="heading-4 px-4 py-3 text-text-primary"
            />
            {!repsEditing && <Pressable onPress={openRepsPicker} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
          </View>
        </View>
      </View>

      {estimated1RM !== null && (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calculator-outline" size={13} color={colors.neutral.textSecondary} />
          <Text className="caption text-text-secondary">Estimated 1RM: {estimated1RM}{weightUnit}</Text>
        </View>
      )}

      <Pressable
        onPress={() => validInput && onSubmit(weightKg, reps)}
        disabled={!validInput}
        style={({ pressed }) => ({ opacity: !validInput ? 0.4 : pressed ? 0.75 : 1 })}
        className="items-center rounded-full bg-brand-yellow py-4"
      >
        <Text className="body-md font-body-semibold text-brand-iron">See My Rank</Text>
      </Pressable>

      <NumberArcPickerModal
        visible={weightPickerOpen}
        title={`WEIGHT (${weightUnit.toUpperCase()})`}
        values={weightValues}
        initialIndex={weightIndex}
        onChangeIndex={(i) => setWeightInput(weightValues[i].toString())}
        onClose={() => setWeightPickerOpen(false)}
        onOpenKeyboard={() => {
          setWeightPickerOpen(false);
          setWeightEditing(true);
          setTimeout(() => weightInputRef.current?.focus(), 300);
        }}
      />

      <NumberArcPickerModal
        visible={repsPickerOpen}
        title="REPS"
        values={repsValues}
        initialIndex={repsIndex}
        onChangeIndex={(i) => setRepsInput(repsValues[i].toString())}
        onClose={() => setRepsPickerOpen(false)}
        onOpenKeyboard={() => {
          setRepsPickerOpen(false);
          setRepsEditing(true);
          setTimeout(() => repsInputRef.current?.focus(), 300);
        }}
      />
    </View>
  );
}

function RevealStep({
  lift,
  weightKg,
  reps,
  weightUnit,
  profile,
  decision,
  sharing,
  shareCardRef,
  onBack,
  onLogAsPr,
  onViewOnly,
  onOpenSimulator,
  onDone,
  onShare,
  onInfo,
}: {
  lift: WizardLift;
  weightKg: number;
  reps: number;
  weightUnit: WeightUnit;
  profile: RankProfile;
  decision: Decision;
  sharing: boolean;
  shareCardRef: RefObject<View | null>;
  onBack: () => void;
  onLogAsPr: () => void;
  onViewOnly: () => void;
  onOpenSimulator: () => void;
  onDone: () => void;
  onShare: () => void;
  onInfo: () => void;
}) {
  const { tier, progressToNextTier } = rankAtWeight(lift, weightKg, reps, profile);
  const plausibility: PlausibilityResult = checkLiftPlausibility(lift.knownCard?.id ?? lift.exercise.id, weightKg, reps, profile);
  const topPercent = Math.max(1, 100 - Math.round(progressToNextTier * 100));

  // "IK ZEI DAT IK DE RANK UP VAN EEN EXERCISE NIET IN EEN CARD WIL HEBBEN... HET MOET ZIJN
  // ZOALS DE LEVEL UP SCHERM" — then, once that was fixed once already, "ik wil niks meer
  // hetzelfde als nu zien... volledig nieuwe pagina." Two real changes from the previous fix,
  // not just decoration: (1) this is `RankUpReveal`, the ladder-based layout, not a second copy of
  // the plain badge-on-a-glow composition `pr-celebration.tsx` already used; (2) it's rendered as
  // its OWN full-screen takeover now (see `WhatsMyRankScreen`'s return below), not a step sharing
  // the wizard's own "WHAT'S MY RANK?" header bar and `ScrollView` — a genuinely new page, the same
  // way `pr-celebration.tsx` already is its own route rather than a tab inside `workout/summary.tsx`.
  return (
    <View style={{ flex: 1 }}>
      <RankUpReveal
        tier={tier}
        exerciseName={lift.name}
        exerciseImageUrl={lift.exercise.imageUrl}
        weightKg={displayWeight(weightKg, weightUnit)}
        reps={reps}
        unit={weightUnit}
        topPercent={topPercent}
        progressToNextTier={progressToNextTier}
        triggerKey={`${lift.exercise.id}-${weightKg}-${reps}`}
        shareRef={shareCardRef}
        onBack={onBack}
        headerRight={
          <View className="flex-row items-center gap-3">
            <Pressable onPress={onInfo} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={18} color={colors.brand.white} />
            </Pressable>
            <Pressable onPress={onShare} hitSlop={8} disabled={sharing}>
              <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={18} color={colors.brand.white} />
            </Pressable>
          </View>
        }
        footer={
          <View style={{ paddingBottom: 24 }} className="gap-3">
            {decision === "pending" ? (
              <>
                {!plausibility.isPlausible && (
                  <View className="flex-row items-start gap-2 rounded-2xl p-3" style={{ backgroundColor: "rgba(255,59,48,0.12)" }}>
                    <Ionicons name="warning" size={16} color={colors.semantic.error} style={{ marginTop: 1 }} />
                    <Text className="body-sm flex-1 text-text-secondary">{plausibility.reason}</Text>
                  </View>
                )}

                <Pressable
                  onPress={onLogAsPr}
                  disabled={!plausibility.isPlausible}
                  style={({ pressed }) => ({ opacity: !plausibility.isPlausible ? 0.4 : pressed ? 0.75 : 1 })}
                  className="items-center rounded-full bg-brand-yellow py-4"
                >
                  <Text className="body-md font-body-semibold text-brand-iron">Log as PR</Text>
                </Pressable>
                <Pressable onPress={onViewOnly} style={{ backgroundColor: "rgba(0,0,0,0.3)" }} className="items-center rounded-full py-4">
                  <Text className="body-md font-body-semibold text-brand-white">View Only</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View className="flex-row items-center justify-center gap-2 rounded-2xl p-3" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                  <Ionicons
                    name={decision === "logged" ? "checkmark-circle" : "eye-outline"}
                    size={16}
                    color={decision === "logged" ? colors.semantic.success : colors.brand.white}
                  />
                  <Text className="body-sm font-body-semibold text-brand-white">
                    {decision === "logged" ? "Logged as your new PR" : "Viewing only — nothing saved"}
                  </Text>
                </View>

                <Pressable onPress={onOpenSimulator} style={PRESSED_STYLE} className="items-center rounded-full bg-brand-yellow py-4">
                  <Text className="body-md font-body-semibold text-brand-iron">Simulate My Progress</Text>
                </Pressable>
                <Pressable onPress={onDone} style={{ backgroundColor: "rgba(0,0,0,0.3)" }} className="items-center rounded-full py-4">
                  <Text className="body-md font-body-semibold text-brand-white">Done</Text>
                </Pressable>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 130;
const CHART_Y_AXIS_WIDTH = 28;
const CHART_PADDING = 14;

function RankProgressionChart({ points, weightUnit }: { points: SimulationPoint[]; weightUnit: WeightUnit }) {
  const tierIndices = points.map((point) => point.tierIndex);
  const minTier = Math.min(...tierIndices);
  const maxTier = Math.max(...tierIndices);
  // The goal doesn't always reach the next tier within the chosen period — render that as a flat
  // line centered on the one tier reached, rather than reserving a phantom tier above it never
  // actually hit.
  const isFlat = minTier === maxTier;
  const range = isFlat ? 1 : maxTier - minTier;

  function yForTier(tierIndex: number): number {
    if (isFlat) return CHART_HEIGHT / 2;
    return CHART_HEIGHT - CHART_PADDING - ((tierIndex - minTier) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
  }

  const stepX = (CHART_WIDTH - CHART_Y_AXIS_WIDTH) / (points.length - 1);
  const coords = points.map((point, index) => ({ x: CHART_Y_AXIS_WIDTH + index * stepX, y: yForTier(point.tierIndex) }));
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  // One badge per rank actually hit along the plotted path (not an arbitrary evenly-spaced sample
  // across the whole range) — a goal that crosses several tiers should show all of them, not just
  // the 3 the old evenly-spaced sampling capped out at.
  const yTicks = Array.from(new Set(tierIndices))
    .sort((a, b) => a - b)
    .map((tierIndex) => ({ tierIndex, y: yForTier(tierIndex) }));

  return (
    <View className="gap-2">
      <View style={{ position: "relative" }}>
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          {yTicks.map((tick) => (
            <Line
              key={tick.tierIndex}
              x1={CHART_Y_AXIS_WIDTH}
              y1={tick.y}
              x2={CHART_WIDTH}
              y2={tick.y}
              stroke={colors.neutral.divider}
              strokeWidth={1}
              strokeDasharray="2,4"
            />
          ))}
          <Path d={pathD} stroke={colors.brand.yellow} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((c, index) => (
            <Circle
              key={index}
              cx={c.x}
              cy={c.y}
              r={4}
              fill={RANK_TIER_COLOR[RANK_TIERS[points[index].tierIndex]]}
              stroke={colors.neutral.background}
              strokeWidth={1.5}
            />
          ))}
        </Svg>

        {yTicks.map((tick) => (
          <View key={tick.tierIndex} pointerEvents="none" style={{ position: "absolute", top: tick.y - 9, left: 0 }}>
            <RankBadge tier={RANK_TIERS[tick.tierIndex]} size={18} />
          </View>
        ))}
      </View>

      <View className="flex-row" style={{ paddingLeft: CHART_Y_AXIS_WIDTH }}>
        {points.map((point, index) => (
          <View key={index} className="items-center" style={{ width: (CHART_WIDTH - CHART_Y_AXIS_WIDTH) / points.length }}>
            <Text className="caption font-body-bold text-text-primary">{formatWeight(point.weightKg, weightUnit)}</Text>
            <Text className="caption text-text-secondary">{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SimulatorStep({
  lift,
  currentWeightKg,
  currentReps,
  weightUnit,
  profile,
  onAnySheetOpenChange,
}: {
  lift: WizardLift;
  currentWeightKg: number;
  currentReps: number;
  weightUnit: WeightUnit;
  profile: RankProfile;
  /** Fires whenever `TierPickerSheet`/`DatePickerModal` opens or closes — lets the wizard's own
   * outer `ScrollView` (this step renders inside it) turn its OWN scroll off while either sheet is
   * up. Both are real bottom sheets that only cover part of the screen, unlike a full-bleed `Modal`
   * (see the weight/reps arc-picker `NumberArcPickerModal` uses, which is a `Modal` covering the
   * whole screen and doesn't have this problem) — with the outer `ScrollView` left scrollable
   * underneath, a drag that starts inside the sheet's own list was being claimed by the WRONG
   * scrollable (the page behind it, not the sheet's list), which is exactly the "ik kan niet
   * scrollen in die lijst" bug: the list itself never moved, the page behind it did. */
  onAnySheetOpenChange: (open: boolean) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return date;
  }, [today]);
  const maxDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + CUSTOM_DATE_MAX_WEEKS * 7);
    return date;
  }, [today]);

  // Either a target weight or a target rank drives the goal — never both at once, so switching
  // modes can't leave a stale value from the other one silently still in effect.
  const [goalMode, setGoalMode] = useState<"weight" | "rank">("weight");
  const [goalInput, setGoalInput] = useState(
    String(Math.round(displayWeight(currentWeightKg + Math.max(5, currentWeightKg * 0.08), weightUnit))),
  );
  // Same tap-to-open `arc-list` wheel every other weight field in the app now uses ("ook hier met de
  // kg de arc fan wordt gebruikt") — the goal-weight field is the one weight input in this whole
  // wizard that had been left on a plain always-editable `TextInput`.
  const [goalWeightPickerOpen, setGoalWeightPickerOpen] = useState(false);
  const [goalWeightEditing, setGoalWeightEditing] = useState(false);
  const [goalWeightRangeBase, setGoalWeightRangeBase] = useState<number | null>(null);
  const goalInputRef = useRef<TextInput>(null);
  const [targetTier, setTargetTier] = useState<RankTier | null>(null);
  const [tierPickerVisible, setTierPickerVisible] = useState(false);
  // Same either/or as the goal above: by default the timeline is auto-estimated from the goal
  // itself (no date chosen at all) — picking a specific date is an explicit opt-in via the tab
  // below, not the starting state.
  const [timelineMode, setTimelineMode] = useState<"auto" | "custom">("auto");
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    onAnySheetOpenChange(tierPickerVisible || datePickerVisible);
  }, [tierPickerVisible, datePickerVisible, onAnySheetOpenChange]);

  // Entered in the user's chosen unit; converted to kg (the canonical unit every rank-math function
  // below expects) immediately, so nothing downstream needs to know a unit toggle exists.
  const enteredGoalWeight = parseFloat(goalInput.replace(",", "."));
  const goalWeightKg = Number.isFinite(enteredGoalWeight) ? (weightUnit === "lbs" ? lbsToKg(enteredGoalWeight) : enteredGoalWeight) : NaN;
  const validGoal = goalMode === "weight" ? Number.isFinite(goalWeightKg) && goalWeightKg > 0 : targetTier !== null;

  const goalWeightValues = useMemo(() => buildNumberRange(goalWeightRangeBase ?? Number(goalInput) ?? 60, 40, 80), [goalWeightRangeBase, goalInput]);
  const goalWeightIndex = Math.max(0, goalWeightValues.indexOf(Math.round(goalWeightRangeBase ?? Number(goalInput) ?? 60)));

  function openGoalWeightPicker() {
    const current = parseFloat(goalInput.replace(",", "."));
    setGoalWeightRangeBase(Number.isFinite(current) ? current : 60);
    setGoalWeightPickerOpen(true);
  }

  // `lift` is the lift as picked in step 1 — if the logged set just became a new PR, its
  // tier/progress are stale (still anchored on the old bestWeightKg). Recompute both fresh so the
  // simulator's own "current" point matches what the reveal step just showed.
  const currentResult = rankAtWeight(lift, currentWeightKg, currentReps, profile);
  const simulatedLift: WizardLift = {
    ...lift,
    bestWeightKg: currentWeightKg,
    bestReps: currentReps,
    tier: currentResult.tier,
    percentileInTier: currentResult.progressToNextTier,
    knownCard: lift.knownCard
      ? { ...lift.knownCard, bestWeightKg: currentWeightKg, bestReps: currentReps, tier: currentResult.tier, percentileInTier: currentResult.progressToNextTier }
      : null,
  };

  // No more "is this realistic?" ceiling — whatever the user enters (a weight, or a rank to reach)
  // is simulated as-is, however far off it is. A rank goal is resolved to the weight that first
  // reaches it (see weightNeededForTier's doc comment for why a search instead of a formula).
  const effectiveGoalKg = !validGoal
    ? 0
    : goalMode === "weight"
      ? goalWeightKg
      : weightNeededForTier(RANK_TIERS.indexOf(targetTier!), (weightKg) => rankAtWeight(simulatedLift, weightKg, currentReps, profile));

  // Auto mode estimates how long the goal itself would take (see weeksNeededForGoal) — no date
  // chosen at all. Custom mode uses whatever date was actually picked, defaulting to that same
  // estimate until one has been.
  const estimatedWeeks = Math.max(1, weeksNeededForGoal(currentWeightKg, effectiveGoalKg));
  const customWeeksFromDate = customEndDate ? Math.max(1, Math.round((customEndDate.getTime() - today.getTime()) / (7 * 86400000))) : null;
  const periodWeeks = timelineMode === "auto" ? estimatedWeeks : (customWeeksFromDate ?? estimatedWeeks);
  const estimatedEndDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + estimatedWeeks * 7);
    return date;
  }, [today, estimatedWeeks]);

  const points = useMemo(
    () =>
      validGoal
        ? simulateRankProgression(currentWeightKg, effectiveGoalKg, periodWeeks, (weightKg) => rankAtWeight(simulatedLift, weightKg, currentReps, profile))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validGoal, effectiveGoalKg, periodWeeks, profile, lift.exercise.id, currentWeightKg, currentReps],
  );
  const goalTier = validGoal ? rankAtWeight(simulatedLift, effectiveGoalKg, currentReps, profile).tier : null;

  function handleSelectDate(date: Date) {
    setCustomEndDate(date);
    setDatePickerVisible(false);
  }

  return (
    <View className="gap-5 px-4 pt-4">
      <View>
        <Text style={subHeaderStyle} className="text-text-primary">
          Simulator — {lift.name}
        </Text>
        <Text className="caption text-text-secondary">Set a goal and see how your rank could climb.</Text>
      </View>

      <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 20 }} className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="caption text-text-secondary">CURRENT</Text>
          <Text className="body-md font-body-bold text-text-primary">
            {formatWeight(currentWeightKg, weightUnit)} × {currentReps}
          </Text>
        </View>
        <RankBadge tier={simulatedLift.tier} size={30} />
      </View>

      <View className="gap-2">
        <Text className="caption font-body-semibold text-text-secondary">GOAL</Text>
        <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 999 }} className="flex-row p-1">
          {(
            [
              { key: "weight", label: "Target Weight" },
              { key: "rank", label: "Target Rank" },
            ] as const
          ).map(({ key, label }) => {
            const active = key === goalMode;
            return (
              <Pressable
                key={key}
                onPress={() => setGoalMode(key)}
                className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
              >
                <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {goalMode === "weight" ? (
          <View style={{ backgroundColor: colors.neutral.surfaceElevated, borderRadius: 16, position: "relative" }} className="flex-row items-center gap-2 px-4 py-3">
            <TextInput
              ref={goalInputRef}
              value={goalInput}
              onChangeText={setGoalInput}
              onBlur={() => setGoalWeightEditing(false)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.neutral.textSecondary}
              className="heading-4 flex-1 text-text-primary"
              style={{ minWidth: 0 }}
            />
            <Text className="body-md font-body-semibold text-text-secondary">{weightUnit} × {currentReps}</Text>
            {!goalWeightEditing && <Pressable onPress={openGoalWeightPicker} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
          </View>
        ) : (
          <Pressable
            onPress={() => setTierPickerVisible(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, backgroundColor: colors.neutral.surfaceElevated, borderRadius: 16 })}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-row items-center gap-2.5">
              {targetTier ? (
                <RankBadge tier={targetTier} size={24} />
              ) : (
                <Ionicons name="trophy-outline" size={20} color={colors.neutral.textSecondary} />
              )}
              <Text className={targetTier ? "heading-4 text-text-primary" : "body-md font-body-semibold text-text-secondary"}>
                {targetTier ? formatRankTier(targetTier) : "Pick a rank"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>

      <View className="gap-2">
        <Text className="caption font-body-semibold text-text-secondary">TIMELINE</Text>
        <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 999 }} className="flex-row p-1">
          {(
            [
              { key: "auto", label: "Auto-Estimate" },
              { key: "custom", label: "Pick Date" },
            ] as const
          ).map(({ key, label }) => {
            const active = key === timelineMode;
            return (
              <Pressable
                key={key}
                onPress={() => setTimelineMode(key)}
                className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
              >
                <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {timelineMode === "auto" ? (
          <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 20 }} className="gap-0.5 p-3">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calculator-outline" size={14} color={colors.neutral.textSecondary} />
              <Text className="body-sm font-body-semibold text-text-primary">
                ~{estimatedWeeks} {estimatedWeeks === 1 ? "week" : "weeks"} at a typical pace
              </Text>
            </View>
            <Text className="caption text-text-secondary">
              Around {estimatedEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} — switch to{" "}
              &quot;Pick Date&quot; to set your own instead.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setDatePickerVisible(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, backgroundColor: colors.neutral.surface, borderRadius: 20 })}
            className="flex-row items-center justify-between px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-text-secondary">
                {customEndDate
                  ? `Ends ${customEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${periodWeeks}w)`
                  : "Pick your target date"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
          </Pressable>
        )}
      </View>

      {goalMode === "rank" && targetTier && (
        <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 20 }} className="flex-row items-center gap-2 p-3">
          <Ionicons name="calculator-outline" size={14} color={colors.neutral.textSecondary} />
          <Text className="body-sm flex-1 text-text-secondary">
            That takes {formatWeight(effectiveGoalKg, weightUnit)} × {currentReps} on {lift.name}.
          </Text>
        </View>
      )}

      {validGoal && points.length > 0 && (
        <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 20 }} className="gap-3 p-4">
          <View className="flex-row items-center justify-between">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 16, fontStyle: "italic", transform: [{ skewX: "-8deg" }] }} className="text-text-primary">
              EXPECTED PROGRESSION
            </Text>
            {goalTier && (
              <View className="flex-row items-center gap-1.5">
                <RankBadge tier={goalTier} size={18} />
                <Text className="caption font-body-bold" style={{ color: RANK_TIER_COLOR[goalTier] }}>
                  {formatRankTier(goalTier)}
                </Text>
              </View>
            )}
          </View>
          <RankProgressionChart points={points} weightUnit={weightUnit} />
        </View>
      )}

      <View style={{ backgroundColor: colors.neutral.surface, borderRadius: 20 }} className="flex-row items-start gap-2 p-3">
        <Ionicons name="flame" size={14} color={colors.semantic.streak} />
        <Text className="body-sm flex-1 text-text-secondary">Stay consistent and eat enough — sleep + food = results.</Text>
      </View>

      <DatePickerModal
        visible={datePickerVisible}
        title="Pick your target date"
        minDate={minDate}
        maxDate={maxDate}
        selectedDate={customEndDate}
        onClose={() => setDatePickerVisible(false)}
        onSelect={handleSelectDate}
      />

      <TierPickerSheet
        visible={tierPickerVisible}
        title="Pick a target rank"
        selectedTier={targetTier}
        onSelect={(tier) => {
          setTargetTier(tier);
          setTierPickerVisible(false);
        }}
        onClose={() => setTierPickerVisible(false)}
      />

      <NumberArcPickerModal
        visible={goalWeightPickerOpen}
        title={`TARGET WEIGHT (${weightUnit.toUpperCase()})`}
        values={goalWeightValues}
        initialIndex={goalWeightIndex}
        onChangeIndex={(i) => setGoalInput(goalWeightValues[i].toString())}
        onClose={() => setGoalWeightPickerOpen(false)}
        onOpenKeyboard={() => {
          setGoalWeightPickerOpen(false);
          setGoalWeightEditing(true);
          setTimeout(() => goalInputRef.current?.focus(), 300);
        }}
      />
    </View>
  );
}

export default function WhatsMyRankScreen() {
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const [step, setStep] = useState<Step>("pick");
  const [selectedLift, setSelectedLift] = useState<WizardLift | null>(null);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);
  const [loggedWeightKg, setLoggedWeightKg] = useState(0);
  const [loggedReps, setLoggedReps] = useState(0);
  const [decision, setDecision] = useState<Decision>("pending");
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);
  // The wizard's own outer `ScrollView` (below) turns its scroll off while this is true — see
  // `SimulatorStep`'s `onAnySheetOpenChange` doc comment for the actual bug this fixes.
  const [simulatorSheetOpen, setSimulatorSheetOpen] = useState(false);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const weightUnit = useWeightUnit();
  const records = usePersonalRecordsStore((state) => state.records);
  const checkAndRecord = usePersonalRecordsStore((state) => state.checkAndRecord);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  function handleBack() {
    if (step === "pick") {
      goBack("/(tabs)/ranks");
    } else if (step === "log") {
      setStep("pick");
    } else if (step === "reveal") {
      setStep("log");
    } else {
      // Simulator is the end of the flow — one tap all the way back to the Ranks tab rather than
      // stepping back through reveal/log/pick first.
      router.replace("/(tabs)/ranks");
    }
  }

  function handleSelectExercise(exercise: Exercise) {
    setSelectedLift(buildWizardLift(exercise, cards, records, profile));
    setStep("log");
  }

  function handleLogSubmit(enteredWeightKg: number, enteredReps: number) {
    setLoggedWeightKg(enteredWeightKg);
    setLoggedReps(enteredReps);
    setDecision("pending");
    setStep("reveal");
  }

  function handleLogAsPr() {
    if (!selectedLift) return;
    checkAndRecord(selectedLift.exercise.id, selectedLift.name, loggedWeightKg, loggedReps);
    ensureExerciseTrackedOnRanksBoard(selectedLift.exercise.id);
    posthog.capture("rank_lift_logged", { exerciseId: selectedLift.exercise.id, weightKg: loggedWeightKg, reps: loggedReps });
    setDecision("logged");
  }

  function handleViewOnly() {
    setDecision("viewOnly");
    setStep("simulator");
  }

  async function handleShare() {
    if (sharing || !selectedLift) return;
    setSharing(true);
    try {
      const { tier } = rankAtWeight(selectedLift, loggedWeightKg, loggedReps, profile);
      const sharedImage = await shareViewAsImage({
        ref: shareCardRef,
        fileName: "gymcrew-rank.png",
        dialogTitle: "Share your rank",
        fallbackMessage: `I just hit ${formatRankTier(tier)} on ${selectedLift.name} (${formatWeight(loggedWeightKg, weightUnit)} × ${loggedReps}) on GymCrew 💪`,
      });
      if (sharedImage) posthog.capture("rank_shared");
    } finally {
      setSharing(false);
    }
  }

  // `reveal` is its own full-screen takeover now, not a step sharing this header/`ScrollView` with
  // pick/log/simulator — see `RevealStep`'s own doc comment for why ("volledig nieuwe pagina").
  if (step === "reveal" && selectedLift) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <RevealStep
          lift={selectedLift}
          weightKg={loggedWeightKg}
          reps={loggedReps}
          weightUnit={weightUnit}
          profile={profile}
          decision={decision}
          sharing={sharing}
          shareCardRef={shareCardRef}
          onBack={handleBack}
          onLogAsPr={handleLogAsPr}
          onViewOnly={handleViewOnly}
          onOpenSimulator={() => setStep("simulator")}
          onDone={() => goBack("/(tabs)/ranks")}
          onShare={handleShare}
          onInfo={() => setInfoExercise(selectedLift.exercise)}
        />
        <ExerciseInstructionsModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      {step !== "pick" && (
        <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
          <Pressable onPress={handleBack} hitSlop={8} style={{ position: "absolute", left: 16 }}>
            <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
          </Pressable>
          <Text style={headerTitleStyle} className="text-text-primary">
            What&apos;s My Rank?
          </Text>
        </View>
      )}

      {step !== "pick" && selectedLift && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!simulatorSheetOpen}
        >
          <Animated.View key={step} entering={FadeInUp.springify().damping(16).mass(0.6)}>
            {step === "log" && (
              <LogStep lift={selectedLift} weightUnit={weightUnit} onSubmit={handleLogSubmit} onInfo={() => setInfoExercise(selectedLift.exercise)} />
            )}

            {step === "simulator" && (
              <SimulatorStep
                lift={selectedLift}
                currentWeightKg={loggedWeightKg}
                currentReps={loggedReps}
                weightUnit={weightUnit}
                profile={profile}
                onAnySheetOpenChange={setSimulatorSheetOpen}
              />
            )}
          </Animated.View>
        </ScrollView>
      )}

      <ExercisePickerModal
        visible={step === "pick"}
        title="What's My Rank?"
        subtitle="Pick any exercise — see its rank, log it as a PR, or simulate your progress."
        onClose={() => goBack("/(tabs)/ranks")}
        onSelect={handleSelectExercise}
        hideCreateRow
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, cards, records, profile)} size={34} />}
      />

      <ExerciseInstructionsModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </View>
  );
}
