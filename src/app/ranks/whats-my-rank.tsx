import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { type RefObject, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { BadgeRevealFx } from "@/components/BadgeRevealFx";
import { DatePickerModal } from "@/components/DatePickerModal";
import { ExerciseInstructionsModal } from "@/components/ExerciseInstructionsModal";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { ProgressBar } from "@/components/ProgressBar";
import { RankBadge } from "@/components/RankBadge";
import type { Exercise } from "@/data/exercises";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { buildLiftRankCards, type LiftRankCard } from "@/lib/lift-rank-cards";
import { checkLiftPlausibility, type PlausibilityResult } from "@/lib/rank-plausibility";
import { formatRankTier, RANK_TIER_COLOR, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import {
  maxRealisticGoalKg,
  rankForHypotheticalWeight,
  simulateRankProgression,
  type HypotheticalRankResult,
  type SimulationPoint,
} from "@/lib/rank-simulator";
import { useDecimalCountUp } from "@/hooks/use-decimal-count-up";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore, type PersonalRecord } from "@/store/personal-records-store";
import { colors, fontFamily } from "@/theme";

type Step = "pick" | "log" | "reveal" | "simulator";
type Decision = "pending" | "logged" | "viewOnly";
const PERIOD_OPTIONS = [4, 8, 12, 16] as const;
const MAX_PERIOD_WEEKS = 16;

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

// Inline-only: NativeWind doesn't reliably compile `transform`/`font-style` onto native when
// combined with a sibling className (see TopBar's wordmarkStyle for the same constraint).
const wordmarkStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 20,
  lineHeight: 22,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-10deg" }],
};

const metricValueStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 17,
  lineHeight: 19,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

const tierNameStyle = {
  fontFamily: fontFamily.heading,
  fontSize: 38,
  lineHeight: 40,
  fontStyle: "italic" as const,
  transform: [{ skewX: "-8deg" }],
};

/** A one-line hype tagline per tier, shown under the "Top X%" pill on the reveal card — the numbers
 * alone read flat, this is what makes the reveal feel like a payoff worth sharing. */
const TIER_HYPE_COPY: Record<RankTier, string> = {
  rookie: "Every legend starts somewhere 💪",
  novice: "Building real momentum 🔥",
  bronze: "Solid work — keep stacking plates",
  silver: "Getting seriously strong",
  gold: "Certified gold-tier strength 🏆",
  platinum: "Elite territory. Respect. 💎",
  diamond: "Crushing it — top-tier form",
  elite: "Genuinely elite strength ⚡",
  master: "Mastery unlocked 👑",
  grandmaster: "Grandmaster-level power",
  champion: "Champion-tier performance 🏆",
  titan: "Titan strength. Unreal.",
  mythic: "Mythic-tier — almost unheard of",
  immortal: "Immortal strength. Legendary.",
  legend: "LEGEND STATUS. 🦁👑",
};

function estimateOneRepMax(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : Math.round(weightKg * (1 + reps / 30));
}

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

function LogStep({ lift, onSubmit, onInfo }: { lift: WizardLift; onSubmit: (weightKg: number, reps: number) => void; onInfo: () => void }) {
  // Bodyweight exercises (crunches, planks, ...) are legitimately 0kg — default that field to "0"
  // instead of blank so it doesn't read as "not filled in yet".
  const isBodyweight = lift.exercise.equipment === "body only";
  const [weightInput, setWeightInput] = useState(lift.bestWeightKg > 0 ? String(lift.bestWeightKg) : isBodyweight ? "0" : "");
  const [repsInput, setRepsInput] = useState(lift.bestReps > 0 ? String(lift.bestReps) : "");

  // Blank still parses to NaN (invalid) — only an explicit "0" (or the bodyweight default above)
  // counts as a real zero-weight entry.
  const weightKg = parseFloat(weightInput.replace(",", "."));
  const reps = parseInt(repsInput, 10);
  const validInput = Number.isFinite(weightKg) && weightKg >= 0 && Number.isFinite(reps) && reps > 0;
  const estimated1RM = validInput ? estimateOneRepMax(weightKg, reps) : null;

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
          <Text className="caption font-body-semibold text-text-secondary">WEIGHT (KG)</Text>
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.neutral.textSecondary}
            className="heading-4 rounded-2xl border border-divider bg-surface px-4 py-3 text-text-primary"
          />
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="caption font-body-semibold text-text-secondary">REPS</Text>
          <TextInput
            value={repsInput}
            onChangeText={setRepsInput}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.neutral.textSecondary}
            className="heading-4 rounded-2xl border border-divider bg-surface px-4 py-3 text-text-primary"
          />
        </View>
      </View>

      {estimated1RM !== null && (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calculator-outline" size={13} color={colors.neutral.textSecondary} />
          <Text className="caption text-text-secondary">Estimated 1RM: {estimated1RM}kg</Text>
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
    </View>
  );
}

function RevealStep({
  lift,
  weightKg,
  reps,
  profile,
  decision,
  sharing,
  shareCardRef,
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
  profile: RankProfile;
  decision: Decision;
  sharing: boolean;
  shareCardRef: RefObject<View | null>;
  onLogAsPr: () => void;
  onViewOnly: () => void;
  onOpenSimulator: () => void;
  onDone: () => void;
  onShare: () => void;
  onInfo: () => void;
}) {
  const { tier, progressToNextTier } = rankAtWeight(lift, weightKg, reps, profile);
  const topPercent = Math.max(1, 100 - Math.round(progressToNextTier * 100));
  const plausibility: PlausibilityResult = checkLiftPlausibility(lift.knownCard?.id ?? lift.exercise.id, weightKg, reps, profile);
  const estimated1RM = estimateOneRepMax(weightKg, reps);
  const animated1RM = useDecimalCountUp(estimated1RM);
  const bwRatio = weightKg / profile.bodyWeightKg;

  return (
    <View className="items-center gap-4 px-6 pt-6">
      <View ref={shareCardRef} collapsable={false} className="w-full items-center gap-4 rounded-3xl border border-divider bg-surface p-5">
        <View className="w-full flex-row items-center justify-between">
          <Text style={wordmarkStyle}>
            <Text className="text-text-primary">GYM</Text>
            <Text className="text-brand-yellow">CREW</Text>
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={onInfo} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={18} color={colors.neutral.textSecondary} />
            </Pressable>
            <Pressable onPress={onShare} hitSlop={8} disabled={sharing}>
              <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={18} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>
        </View>

        <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {lift.name}
        </Text>

        <BadgeRevealFx tier={tier} triggerKey={`${lift.exercise.id}-${weightKg}-${reps}`} size={170} />

        <View className="items-center gap-1.5">
          <Text style={[tierNameStyle, { color: RANK_TIER_COLOR[tier] }]} numberOfLines={1}>
            {formatRankTier(tier).toUpperCase()}
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full border px-3 py-1" style={{ borderColor: RANK_TIER_COLOR[tier] }}>
            <Ionicons name="flame" size={12} color={RANK_TIER_COLOR[tier]} />
            <Text className="caption font-body-semibold" style={{ color: RANK_TIER_COLOR[tier] }}>
              Top {topPercent}% for your bodyweight
            </Text>
          </View>
          <Text className="body-sm text-text-secondary">{TIER_HYPE_COPY[tier]}</Text>
        </View>

        <View className="w-full">
          <ProgressBar ratio={progressToNextTier} color={RANK_TIER_COLOR[tier]} height={6} />
        </View>

        <View className="w-full flex-row gap-2">
          <View className="flex-1 items-center gap-0.5 rounded-2xl border border-divider bg-background p-3">
            <Text className="caption text-text-secondary">THIS SET</Text>
            <Text style={metricValueStyle} className="text-text-primary">
              {weightKg}kg × {reps}
            </Text>
          </View>
          <View className="flex-1 items-center gap-0.5 rounded-2xl border border-divider bg-background p-3">
            <Text className="caption text-text-secondary">EST. 1RM</Text>
            <Text style={metricValueStyle} className="text-text-primary">
              {animated1RM}kg
            </Text>
          </View>
          <View className="flex-1 items-center gap-0.5 rounded-2xl border border-divider bg-background p-3">
            <Text className="caption text-text-secondary">BW RATIO</Text>
            <Text style={metricValueStyle} className="text-text-primary">
              {bwRatio.toFixed(1)}×
            </Text>
          </View>
        </View>
      </View>

      {decision === "pending" && (
        <View className="w-full gap-3">
          {!plausibility.isPlausible && (
            <View className="flex-row items-start gap-2 rounded-2xl border border-error/40 bg-error/10 p-3">
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
          <Pressable onPress={onViewOnly} style={PRESSED_STYLE} className="items-center rounded-full border border-divider py-4">
            <Text className="body-md font-body-semibold text-text-primary">View Only</Text>
          </Pressable>
        </View>
      )}

      {decision !== "pending" && (
        <View className="w-full gap-3">
          <View
            className={`flex-row items-center justify-center gap-2 rounded-2xl p-3 ${
              decision === "logged" ? "border border-success/40 bg-success/10" : "border border-divider bg-surface"
            }`}
          >
            <Ionicons
              name={decision === "logged" ? "checkmark-circle" : "eye-outline"}
              size={16}
              color={decision === "logged" ? colors.semantic.success : colors.neutral.textSecondary}
            />
            <Text className="body-sm font-body-semibold text-text-primary">
              {decision === "logged" ? "Logged as your new PR" : "Viewing only — nothing saved"}
            </Text>
          </View>

          <Pressable onPress={onOpenSimulator} style={PRESSED_STYLE} className="items-center rounded-full bg-brand-yellow py-4">
            <Text className="body-md font-body-semibold text-brand-iron">Simulate My Progress</Text>
          </Pressable>
          <Pressable onPress={onDone} style={PRESSED_STYLE} className="items-center rounded-full border border-divider py-4">
            <Text className="body-md font-body-semibold text-text-primary">Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 130;
const CHART_Y_AXIS_WIDTH = 28;
const CHART_PADDING = 14;

function RankProgressionChart({ points }: { points: SimulationPoint[] }) {
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

  const tickCount = isFlat ? 1 : Math.min(3, range + 1);
  const yTicks = Array.from(
    new Map(
      Array.from({ length: tickCount }, (_, i) => {
        const tierIndex = isFlat ? minTier : Math.round(minTier + (range * i) / Math.max(1, tickCount - 1));
        return [tierIndex, { tierIndex, y: yForTier(tierIndex) }];
      }),
    ).values(),
  );

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
            <Text className="caption font-body-bold text-text-primary">{point.weightKg}kg</Text>
            <Text className="caption text-text-secondary">{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SimulatorStep({ lift, currentWeightKg, currentReps, profile }: { lift: WizardLift; currentWeightKg: number; currentReps: number; profile: RankProfile }) {
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return date;
  }, [today]);
  const maxDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + MAX_PERIOD_WEEKS * 7);
    return date;
  }, [today]);

  const [goalInput, setGoalInput] = useState(String(Math.round(currentWeightKg + Math.max(5, currentWeightKg * 0.08))));
  const [periodWeeks, setPeriodWeeks] = useState<number>(8);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const goalWeightKg = parseFloat(goalInput.replace(",", "."));
  const validGoal = Number.isFinite(goalWeightKg) && goalWeightKg > 0;

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

  const realisticGoalKg = maxRealisticGoalKg(currentWeightKg, periodWeeks);
  const isUnrealistic = validGoal && goalWeightKg > realisticGoalKg;
  const effectiveGoalKg = validGoal ? Math.min(goalWeightKg, realisticGoalKg) : 0;

  const points = useMemo(
    () =>
      validGoal
        ? simulateRankProgression(currentWeightKg, effectiveGoalKg, periodWeeks, (weightKg) => rankAtWeight(simulatedLift, weightKg, currentReps, profile))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validGoal, effectiveGoalKg, periodWeeks, profile, lift.exercise.id, currentWeightKg, currentReps],
  );
  const goalTier = validGoal ? rankAtWeight(simulatedLift, effectiveGoalKg, currentReps, profile).tier : null;

  function selectPreset(weeks: number) {
    setPeriodWeeks(weeks);
    setCustomEndDate(null);
  }

  function handleSelectDate(date: Date) {
    const days = Math.round((date.getTime() - today.getTime()) / 86400000);
    const weeks = Math.min(MAX_PERIOD_WEEKS, Math.max(1, Math.round(days / 7)));
    setPeriodWeeks(weeks);
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

      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1 rounded-2xl border border-divider bg-surface p-3">
          <Text className="caption text-text-secondary">CURRENT</Text>
          <Text className="body-md font-body-bold text-text-primary">
            {currentWeightKg}kg × {currentReps}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.neutral.textSecondary} />
        <View className="flex-1 gap-1 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-3">
          <Text className="caption text-brand-yellow">GOAL</Text>
          <View className="flex-row items-center gap-1">
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              className="body-md font-body-bold text-text-primary"
              style={{ minWidth: 40 }}
            />
            <Text className="body-md font-body-bold text-text-primary">
              kg × {currentReps}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-2">
        <Text className="caption font-body-semibold text-text-secondary">PERIOD (MAX {MAX_PERIOD_WEEKS} WEEKS)</Text>
        <View className="flex-row rounded-full border border-divider bg-surface p-1">
          {PERIOD_OPTIONS.map((weeks) => {
            const active = weeks === periodWeeks && !customEndDate;
            return (
              <Pressable
                key={weeks}
                onPress={() => selectPreset(weeks)}
                className={`flex-1 items-center rounded-full py-2 ${active ? "bg-brand-yellow" : ""}`}
              >
                <Text className={`caption font-body-semibold ${active ? "text-brand-iron" : "text-text-secondary"}`}>{weeks}w</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setDatePickerVisible(true)}
          style={PRESSED_STYLE}
          className="flex-row items-center justify-between rounded-2xl border border-divider bg-surface px-4 py-3"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={16} color={colors.neutral.textSecondary} />
            <Text className="body-sm text-text-secondary">
              {customEndDate
                ? `Ends ${customEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${periodWeeks}w)`
                : "Pick an end date instead"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      {isUnrealistic && (
        <View className="flex-row items-start gap-2 rounded-2xl border border-error/40 bg-error/10 p-3">
          <Ionicons name="warning" size={16} color={colors.semantic.error} style={{ marginTop: 1 }} />
          <Text className="body-sm flex-1 text-text-secondary">
            {Math.round(goalWeightKg - currentWeightKg)}kg in {periodWeeks} weeks isn&apos;t realistic — showing your realistic ceiling of{" "}
            {realisticGoalKg}kg instead.
          </Text>
        </View>
      )}

      {validGoal && points.length > 0 && (
        <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
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
          <RankProgressionChart points={points} />
        </View>
      )}

      <View className="flex-row items-start gap-2 rounded-2xl border border-divider bg-surface p-3">
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
    </View>
  );
}

export default function WhatsMyRankScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("pick");
  const [selectedLift, setSelectedLift] = useState<WizardLift | null>(null);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);
  const [loggedWeightKg, setLoggedWeightKg] = useState(0);
  const [loggedReps, setLoggedReps] = useState(0);
  const [decision, setDecision] = useState<Decision>("pending");
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const checkAndRecord = usePersonalRecordsStore((state) => state.checkAndRecord);

  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  function handleBack() {
    if (step === "pick") {
      router.back();
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
    setDecision("logged");
  }

  function handleViewOnly() {
    setDecision("viewOnly");
    setStep("simulator");
  }

  function shareAsText() {
    if (!selectedLift) return;
    const { tier } = rankAtWeight(selectedLift, loggedWeightKg, loggedReps, profile);
    // Share.share returns a rejected promise on web when the browser has no native share sheet —
    // .catch() it so that never surfaces as an unhandled rejection.
    Share.share({
      message: `I just hit ${formatRankTier(tier)} on ${selectedLift.name} (${loggedWeightKg}kg × ${loggedReps}) on GymCrew 💪`,
    }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  async function handleShare() {
    if (sharing || !shareCardRef.current) return;
    if (Platform.OS === "web") {
      shareAsText();
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        shareAsText();
      }
    } catch (error) {
      console.warn("Failed to capture rank reveal screenshot, falling back to text share", error);
      shareAsText();
    } finally {
      setSharing(false);
    }
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
        >
          <Animated.View key={step} entering={FadeInUp.springify().damping(16).mass(0.6)}>
            {step === "log" && <LogStep lift={selectedLift} onSubmit={handleLogSubmit} onInfo={() => setInfoExercise(selectedLift.exercise)} />}

            {step === "reveal" && (
              <RevealStep
                lift={selectedLift}
                weightKg={loggedWeightKg}
                reps={loggedReps}
                profile={profile}
                decision={decision}
                sharing={sharing}
                shareCardRef={shareCardRef}
                onLogAsPr={handleLogAsPr}
                onViewOnly={handleViewOnly}
                onOpenSimulator={() => setStep("simulator")}
                onDone={() => router.back()}
                onShare={handleShare}
                onInfo={() => setInfoExercise(selectedLift.exercise)}
              />
            )}

            {step === "simulator" && <SimulatorStep lift={selectedLift} currentWeightKg={loggedWeightKg} currentReps={loggedReps} profile={profile} />}
          </Animated.View>
        </ScrollView>
      )}

      <ExercisePickerModal
        visible={step === "pick"}
        title="What's My Rank?"
        subtitle="Pick any exercise — see its rank, log it as a PR, or simulate your progress."
        onClose={() => router.back()}
        onSelect={handleSelectExercise}
        hideCreateRow
      />

      <ExerciseInstructionsModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </View>
  );
}
