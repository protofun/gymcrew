import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInLeft, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { AuthField } from "@/components/AuthField";
import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { EditableNumberFlow } from "@/components/EditableAnimated";
import { EditableText } from "@/components/EditableText";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { NewPrsBanner } from "@/components/NewPrsBanner";
import { PrShareCard } from "@/components/PrShareCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RankBadge } from "@/components/RankBadge";
import { SegmentedField } from "@/components/SegmentedField";
import { ShareCardModal } from "@/components/ShareCardModal";
import { WorkoutShareCard } from "@/components/WorkoutShareCard";
import { WorkoutStatsTabs } from "@/components/WorkoutStatsTabs";
import { Accordion } from "@/components/ui/molecules/accordion";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { AI_ACCORDION_THEME } from "@/constants/ai-scan-theme";
import { images } from "@/constants/images";
import { EXERCISE_BY_ID, formatMuscleName } from "@/data/exercises";
import { formatElapsed } from "@/hooks/use-elapsed-timer";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { toDateKey } from "@/lib/date";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatReadyAt, formatRecoveryLabel, recoveryStatusForWorkout, type MuscleRecoveryStatus } from "@/lib/muscle-recovery";
import { sumMacros } from "@/lib/nutrition-macros";
import { RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { displayWeight, formatWeight } from "@/lib/units";
import { estimateOneRepMax } from "@/lib/workout-metrics";
import { estimateCalories } from "@/lib/workout-sessions";
import { warAttackScore } from "@/lib/war";
import type { WorkoutPr } from "@/lib/workout-finish";
import { workoutXpEarned } from "@/lib/xp";
import { useCrewWarStore } from "@/store/crew-war-store";
import type { LoggedExercise, WeightUnit } from "@/store/active-workout-store";
import { useNutritionLogStore } from "@/store/nutrition-log-store";
import { useNutritionTargetsStore } from "@/store/nutrition-targets-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors, fontFamily } from "@/theme";

/** Shown right after finishing (see `justFinished`) — the War-attack score for this workout,
 * computed instantly client-side (see lib/war.ts) since the real attack call is fire-and-forget
 * and shouldn't block finishing. `war` itself is read reactively from the store, so the standing
 * line below fills in a moment later once that call actually resolves. Renders nothing without a
 * crew (war stays null) or without any real volume to attack with. A war attack is a big moment,
 * so it gets the running golden light. */
function WarAttackSummary({ volumeKg, prCount }: { volumeKg: number; prCount: number }) {
  const war = useCrewWarStore((state) => state.war);
  if (!war || war.status !== "active" || volumeKg <= 0) return null;

  const score = warAttackScore(volumeKg, prCount);
  const leading = war.myScore >= war.opponentScore;

  return (
    <View>
      <BrandBeamFrame borderRadius={24}>
        <View style={{ backgroundColor: colors.neutral.background }} className="gap-1 p-4">
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1, color: colors.brand.yellow }}>CREW WAR ATTACK</Text>
          <View className="flex-row items-baseline gap-1.5">
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, color: colors.brand.white }}>+</Text>
            <NumberFlow value={score} fontSize={34} color={colors.brand.white} fontWeight="800" />
          </View>
          <Text className="caption text-text-secondary">
            Crew {leading ? "leads" : "trails"} {Math.round(war.myScore).toLocaleString("en-US")} vs {Math.round(war.opponentScore).toLocaleString("en-US")} · {war.opponent.name}
          </Text>
        </View>
      </BrandBeamFrame>
    </View>
  );
}

/** "Today's Fuel" — the nutrition connection on the just-finished screen (see NUTRITION.md section
 * 28). Renders nothing without real targets set yet, same "don't push half-configured features"
 * rule the Home food column follows — a fresh workout finish is not the moment to interrupt with a
 * nutrition setup flow. */
function TodaysFuelCard() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const entries = useNutritionLogStore((state) => state.entries);
  const calories = useNutritionTargetsStore((state) => state.calories);
  const proteinTarget = useNutritionTargetsStore((state) => state.proteinG);

  const totals = useMemo(() => sumMacros(entries.filter((entry) => entry.dateKey === todayKey)), [entries, todayKey]);

  if (calories === null || proteinTarget === null) return null;

  const proteinRemaining = Math.max(0, Math.round(proteinTarget - totals.proteinG));

  return (
    <View className="gap-3 border-y border-divider py-4">
      <View className="flex-row items-end justify-between">
        <View>
          <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1, color: colors.neutral.textSecondary }}>TODAY&apos;S FUEL</Text>
          <View className="flex-row items-baseline gap-1.5">
            <NumberFlow value={Math.round(totals.calories)} fontSize={30} color={colors.brand.white} fontWeight="800" />
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 13, color: colors.neutral.textSecondary }}>{`/ ${calories} kcal`}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/nutrition/add")} accessibilityLabel="Add food" className="h-10 flex-row items-center gap-1 rounded-full bg-brand-yellow px-4">
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 1, color: colors.brand.iron }}>+ ADD FOOD</Text>
        </Pressable>
      </View>
      <AnimatedProgressBar progress={calories > 0 ? Math.min(1, totals.calories / calories) : 0} height={5} borderRadius={3} progressColor={colors.semantic.streak} trackColor={colors.neutral.divider} animationDuration={900} />
      <Text className="caption text-text-secondary">{proteinRemaining > 0 ? `You still need ${proteinRemaining}g protein today.` : "Protein goal hit for today 🔥"}</Text>
    </View>
  );
}

/** The single heaviest completed (non-warmup) set of the workout — the "highlight" lift to call
 * out on the results screen, separate from `lib/workout-sessions.ts`'s `primaryExercise` (which
 * only tracks estimated 1RM, not the actual weight×reps worth showing here). */
function topLiftOf(workout: CompletedWorkout): { name: string; weightKg: number; reps: number } | null {
  let best: { name: string; weightKg: number; reps: number } | null = null;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (!set.completed || set.isWarmup || set.weightKg == null) continue;
      if (!best || set.weightKg > best.weightKg) {
        best = { name: exercise.name, weightKg: set.weightKg, reps: set.reps ?? 0 };
      }
    }
  }
  return best;
}

type Tab = "overview" | "exercises" | "muscles" | "prs";
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "exercises", label: "Exercises" },
  { key: "muscles", label: "Muscles" },
  { key: "prs", label: "PRs" },
] as const;

function ratingFor(workout: CompletedWorkout): { emoji: string; label: string; detail: string } {
  const prCount = workout.prs.length;
  if (prCount > 0) {
    return { emoji: "🔥", label: "Monster Session!", detail: `Great intensity and ${prCount} new PR${prCount > 1 ? "s" : ""}.` };
  }
  if (workout.completedSets >= 15) return { emoji: "💪", label: "Strong Session", detail: "Solid volume today." };
  if (workout.completedSets > 0) return { emoji: "✅", label: "Workout Logged", detail: "Nice work getting it done." };
  return { emoji: "📝", label: "Session Recorded", detail: "No sets were marked complete." };
}

function StatItem({ id, label, value, suffix, numeric }: { id: string; label: string; value: string; suffix?: string; numeric?: number }) {
  return (
    <View className="items-center gap-1" style={{ width: "33.33%" }}>
      <View style={{ height: 40 }} className="items-center justify-center">
        {numeric !== undefined ? (
          <EditableNumberFlow id={id} value={numeric} fontSize={30} suffix={suffix} />
        ) : (
          <EditableText id={id} style={{ fontFamily: fontFamily.heading, fontSize: 32, lineHeight: 36, letterSpacing: 1, color: colors.brand.white }}>
            {value}
          </EditableText>
        )}
      </View>
      <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 1, color: colors.neutral.textSecondary }}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** One exercise as a row of the Reacticx accordion: its name and set count, and — opened up — every set. Must be a direct child of the Accordion. */
function ExerciseAccordionRow({ exercise, unit, hasPr, isLast }: { exercise: LoggedExercise; unit: WeightUnit; hasPr: boolean; isLast: boolean }) {
  const completedSets = exercise.sets.filter((set) => set.completed);

  return (
    <Accordion.Item value={exercise.exerciseId} isLast={isLast}>
      <Accordion.Trigger>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <EditableText id={`workout.summary.exercise.${exercise.exerciseId}.name`} style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.8, color: colors.brand.white }}>
              {exercise.name.toUpperCase()}
            </EditableText>
            {hasPr && <Ionicons name="trophy" size={14} color={colors.brand.yellow} />}
          </View>
          <EditableText id={`workout.summary.exercise.${exercise.exerciseId}.subtitle`} className="caption text-text-secondary">
            {`${completedSets.length} of ${exercise.sets.length} sets · ${formatMuscleName(exercise.primaryMuscle)}`}
          </EditableText>
        </View>
      </Accordion.Trigger>

      <Accordion.Content>
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2 px-1">
            <Text className="caption w-8 text-text-secondary">SET</Text>
            <Text className="caption flex-1 text-center text-text-secondary">{unit.toUpperCase()}</Text>
            <Text className="caption flex-1 text-center text-text-secondary">REPS</Text>
            <Text className="caption w-8 text-center text-text-secondary">✓</Text>
          </View>
          {exercise.sets.map((set, index) => (
            <View key={set.id} className={`flex-row items-center gap-2 rounded-xl px-1 py-2 ${set.completed ? "bg-success/20" : ""}`}>
              <Text className="body-sm w-8 text-text-secondary">{index + 1}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.weightKg !== null ? displayWeight(set.weightKg, unit) : "—"}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.reps ?? "—"}</Text>
              <View className="w-8 items-center">
                <Ionicons name={set.completed ? "checkmark-circle" : "ellipse-outline"} size={16} color={set.completed ? colors.semantic.success : colors.neutral.textSecondary} />
              </View>
            </View>
          ))}
          {!!exercise.note && <Text className="body-sm mt-1 italic text-text-secondary">{exercise.note}</Text>}
        </View>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function MuscleRecoveryRow({ status, index }: { status: MuscleRecoveryStatus; index: number }) {
  const dotColor = status.isRecovered ? colors.semantic.success : colors.semantic.warning;
  return (
    <Animated.View entering={FadeInLeft.delay(index * 60).duration(320)} className="flex-row items-center gap-3 border-b border-divider py-3">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <Text style={{ fontFamily: fontFamily.heading, fontSize: 21, letterSpacing: 0.8, color: colors.brand.white, flex: 1 }}>{formatMuscleLabel(status.group).toUpperCase()}</Text>
      <View className="items-end">
        <Text className="caption font-body-semibold" style={{ color: dotColor }}>
          {formatRecoveryLabel(status)}
        </Text>
        {status.readyAt !== null && !status.isRecovered && <Text className="caption text-text-secondary">{formatReadyAt(status.readyAt)}</Text>}
      </View>
    </Animated.View>
  );
}

function PrRow({ pr, tier, unit, index, onPress }: { pr: WorkoutPr; tier: RankTier; unit: WeightUnit; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInLeft.delay(index * 80).duration(320)}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })} className="flex-row items-center gap-4 border-b border-divider py-3.5">
        <RankBadge tier={tier} size={52} />
        <View className="flex-1 gap-0.5">
          <EditableText id={`workout.summary.pr.${pr.exerciseId}.name`} style={{ fontFamily: fontFamily.heading, fontSize: 24, lineHeight: 26, letterSpacing: 0.8, color: colors.brand.white }} numberOfLines={1}>
            {pr.exerciseName.toUpperCase()}
          </EditableText>
          <EditableText id={`workout.summary.pr.${pr.exerciseId}.detail`} className="caption text-text-secondary">
            {`${formatWeight(pr.weightKg, unit)} × ${pr.reps}${pr.previousBestKg !== null ? ` · +${formatWeight(pr.weightKg - pr.previousBestKg, unit)}` : ""}`}
          </EditableText>
        </View>
        <Ionicons name="share-outline" size={18} color={colors.neutral.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export default function WorkoutSummaryScreen() {
  const insets = useSafeAreaInsets();
  // `justFinished` is only ever set by the finish flow (active.tsx / pr-celebration.tsx) — every
  // other entry point (history, calendar, notifications) opens this screen without it, so the
  // "just finished" hero below never shows up on an old workout opened later.
  const { id, justFinished } = useLocalSearchParams<{ id: string; justFinished?: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPr, setSharingPr] = useState<{ pr: WorkoutPr; tier: RankTier; topPercent: number | null; progressToNextTier: number | null } | null>(
    null,
  );
  const posthog = usePostHog();

  const allWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const workout = allWorkouts.find((w) => w.id === id) ?? allWorkouts[0];
  const updateWorkoutNotes = useWorkoutHistoryStore((state) => state.updateWorkoutNotes);
  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const bodyWeightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const weightUnit = useWeightUnit();

  const rankProfile: RankProfile = useMemo(() => ({ gender, bodyWeightKg, age }), [gender, bodyWeightKg, age]);

  if (!workout) {
    router.replace("/home");
    return null;
  }

  const rating = ratingFor(workout);
  const prExerciseIds = new Set(workout.prs.map((pr) => pr.exerciseId));
  const topLift = topLiftOf(workout);
  const calories = estimateCalories(Math.round(workout.durationSeconds / 60), bodyWeightKg);
  const xpEarned = workoutXpEarned(workout.prs.length);

  const prsWithTier = workout.prs.map((pr) => {
    const exercise = EXERCISE_BY_ID[pr.exerciseId];
    const detail = exercise ? genericExerciseRankDetail(exercise, pr.weightKg, pr.reps, rankProfile) : null;
    const tier: RankTier = detail?.tier ?? "rookie";
    const topPercent = detail ? Math.max(1, 100 - Math.round(detail.progressToNextTier * 100)) : null;
    return { pr, tier, topPercent, progressToNextTier: detail?.progressToNextTier ?? null };
  });
  const topTier: RankTier | null =
    prsWithTier.length > 0
      ? prsWithTier.reduce((best, cur) => (RANK_TIERS.indexOf(cur.tier) > RANK_TIERS.indexOf(best) ? cur.tier : best), prsWithTier[0].tier)
      : null;
  // A plain call, not useMemo — this is cheap (10 muscle groups) and `workout` is only known-defined
  // past the early return above, so a hook here would be called conditionally between renders.
  const recoveryStatuses = recoveryStatusForWorkout(workout);

  // `router.back()` alone silently does nothing without real navigation history — the finish flow
  // reaches this screen via `router.replace()` (active.tsx / pr-celebration.tsx), which can leave
  // nothing to go back to, especially after a web/PWA reload. Same fix as workout/active.tsx.
  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  function handleOpenShare() {
    posthog.capture("workout_shared", {
      workout_name: workout!.name,
      volume_kg: workout!.volumeKg,
      completed_sets: workout!.completedSets,
      duration_seconds: workout!.durationSeconds,
    });
    setShareModalVisible(true);
  }

  const shareFallbackMessage = `${workout.name} — ${formatElapsed(workout.durationSeconds)}, ${formatWeight(
    workout.volumeKg,
    weightUnit,
  )} lifted across ${workout.completedSets} sets on GymCrew.`;

  const prShareFallbackMessage = sharingPr
    ? `New PR on ${sharingPr.pr.exerciseName}: ${formatWeight(sharingPr.pr.weightKg, weightUnit)} × ${sharingPr.pr.reps} on GymCrew! 💪`
    : "";

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={handleBack} hitSlop={8} accessibilityLabel="Back" className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface">
          <Ionicons name="chevron-back" size={20} color={colors.neutral.textPrimary} />
        </Pressable>
        <Pressable onPress={handleOpenShare} hitSlop={8} accessibilityLabel="Share workout" className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface">
          <Ionicons name="share-outline" size={19} color={colors.neutral.textPrimary} />
        </Pressable>
      </View>

      <View className="gap-1 px-4 pb-4">
        {/* Every word used to be its own `AnimatedText`, each mounted with no `flex-row` around them —
            RN's default column layout stacked them one per line no matter how short the name was
            ("PUSH" / "DAY" on two lines even though "PUSH DAY" fits easily on one). `flex-row flex-wrap`
            lets them run one after another and only wrap if the name is genuinely too long for the width. */}
        <View key={workout.name} className="flex-row flex-wrap items-baseline" style={{ columnGap: 12 }}>
          {workout.name
            .toUpperCase()
            .split(" ")
            .map((word, index) => (
              <AnimatedText key={`${word}-${index}`} text={word} animationConfig={{ characterDelay: 30 }} enterFrom={{ translateY: 34, scale: 0.4 }} style={{ fontFamily: fontFamily.heading, fontSize: 44, lineHeight: 46, letterSpacing: 1, color: colors.brand.white }} />
            ))}
        </View>
        <EditableText id="workout.summary.dateAndDuration" className="caption text-text-secondary">
          {`${new Date(workout.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${formatElapsed(workout.durationSeconds)}`}
        </EditableText>
      </View>

      <View className="px-4">
        <SegmentedField options={TABS} value={tab} onChange={setTab} paddingVertical={12} />
      </View>

      {/* Both style props are inline here, not className — mixing the two is unreliable on native with
          this project's NativeWind preview version (same class of bug as the TextInput textAlign crash:
          works on web, silently drops or conflicts on native). A `flex-1` className that quietly
          doesn't apply is exactly what would let this ScrollView size to its content instead of the
          remaining space, which reads as "the header above it scrolls away too" — there's no longer a
          distinct fixed region above a constrained scrollable one, just one tall column.
          The PR/mascot celebration banner, the Crew War attack summary, Today's Fuel, and the
          backfilled notice used to sit ABOVE this ScrollView, alongside the back/share row, title and
          tabs — genuinely pinned, exactly as built, but that pinned a LOT more than a header actually
          needs to be: "blijft er heel veel wat bovenaan staat vast in beeld... dat moet niet mee komen
          scrollen" turned out to mean the opposite of what it reads like at first — not "make MORE of
          it stick," but "far too much is stuck; only the very top bit should be." Moved inside the
          ScrollView as its first children instead — only the back/share row, the title/date, and the
          tab bar remain truly fixed now, the same amount of "header" every other screen in this app
          pins, and the celebration content scrolls away with the rest like any other content. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 30, paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Only shown right after finishing (see `justFinished` above) — this is what used to be its
            own screen (workout/complete.tsx). Folding it in here cuts a full screen out of every
            "finish workout" flow and puts the exercise/muscle breakdown one scroll away instead of
            one tab-and-a-screen away. */}
        {justFinished === "1" &&
          (workout.prs.length > 0 ? (
            <NewPrsBanner count={workout.prs.length} topTier={topTier ?? "rookie"} exerciseNames={workout.prs.map((pr) => pr.exerciseName)} xpEarned={xpEarned} />
          ) : (
            <View className="flex-row items-center gap-4">
              <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 110, height: 110 * (205 / 250) }} />
              <View className="flex-1 gap-1.5">
                <AnimatedText text="WORKOUT COMPLETE!" animationConfig={{ characterDelay: 26 }} enterFrom={{ translateY: 28, scale: 0.4 }} style={{ fontFamily: fontFamily.heading, fontSize: 30, lineHeight: 32, letterSpacing: 1, color: colors.brand.yellow }} />
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="flame" size={16} color={colors.semantic.streak} />
                  <EditableText id="workout.summary.celebrationName" className="body-lg font-body-semibold text-text-secondary">
                    {workout.name}
                  </EditableText>
                </View>
              </View>
            </View>
          ))}

        {justFinished === "1" && !workout.isBackfilled && <WarAttackSummary volumeKg={workout.volumeKg} prCount={workout.prs.length} />}
        {justFinished === "1" && <TodaysFuelCard />}

        {workout.isBackfilled && (
          <View className="flex-row items-center gap-2.5 border-y border-divider py-3">
            <Ionicons name="information-circle-outline" size={18} color={colors.neutral.textSecondary} />
            <Text className="body-sm flex-1 text-text-secondary">Logged for a past day — this workout doesn&apos;t count toward XP, streaks, personal records, or Crew War.</Text>
          </View>
        )}

        {tab === "overview" && (
          <Animated.View key="overview" entering={FadeInUp.duration(300)} className="gap-8">
            <View className="flex-row flex-wrap gap-y-5 border-y border-divider py-5">
              <StatItem id="workout.summary.duration" label="Duration" value={formatElapsed(workout.durationSeconds)} />
              <StatItem id="workout.summary.volume" label="Volume" value="" numeric={displayWeight(workout.volumeKg, weightUnit)} suffix={weightUnit} />
              <StatItem id="workout.summary.sets" label="Sets" value="" numeric={workout.completedSets} />
              <StatItem id="workout.summary.prs" label="PRs" value="" numeric={workout.prs.length} />
              <StatItem id="workout.summary.calories" label="Calories" value="" numeric={calories} suffix="kcal" />
            </View>

            {topLift && (
              <View className="gap-1">
                <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1, color: colors.brand.yellow }}>TOP LIFT</Text>
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 30, letterSpacing: 1, color: colors.brand.white }}>{topLift.name.toUpperCase()}</Text>
                <Text className="body-sm text-text-secondary">
                  {formatWeight(topLift.weightKg, weightUnit)} × {topLift.reps} · est. 1RM {formatWeight(estimateOneRepMax(topLift.weightKg, topLift.reps), weightUnit)}
                </Text>
              </View>
            )}

            {workout.prs.length > 0 && (
              <Pressable onPress={() => router.push("/profile/achievements")} className="flex-row items-center justify-center gap-1.5 py-1">
                <Text style={{ fontFamily: fontFamily.heading, fontSize: 18, letterSpacing: 1, color: colors.brand.yellow }}>VIEW ALL YOUR PRS</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brand.yellow} />
              </Pressable>
            )}

            {!justFinished && (
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 30 }}>{rating.emoji}</Text>
                <View className="flex-1 gap-0.5">
                  <Text style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 0.8, color: colors.brand.white }}>{rating.label.toUpperCase()}</Text>
                  <Text className="body-sm text-text-secondary">{rating.detail}</Text>
                </View>
              </View>
            )}

            <WorkoutStatsTabs workout={workout} workouts={allWorkouts} bodyWeightKg={bodyWeightKg} />

            <AuthField
              label="Notes"
              placeholders={["How did this workout feel?", "Sore? Strong? A new PR?", "What would you change next time?"]}
              value={workout.notes}
              onChangeText={(text) => updateWorkoutNotes(workout!.id, text)}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>
        )}

        {tab === "exercises" &&
          (workout.exercises.length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No exercises logged.</Text>
          ) : (
            <Animated.View key="exercises" entering={FadeInUp.duration(300)} className="-mt-4">
              <Accordion type="single" flush theme={AI_ACCORDION_THEME}>
                {workout.exercises.map((exercise, index) => (
                  <ExerciseAccordionRow key={exercise.exerciseId} exercise={exercise} unit={weightUnit} hasPr={prExerciseIds.has(exercise.exerciseId)} isLast={index === workout.exercises.length - 1} />
                ))}
              </Accordion>
            </Animated.View>
          ))}

        {tab === "muscles" &&
          (Object.keys(workout.muscleIntensity).length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No muscle data for this workout.</Text>
          ) : (
            <Animated.View key="muscles" entering={FadeInUp.duration(300)} className="gap-6">
              <View className="items-center">
                <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={300} gender={gender} />
              </View>

              {recoveryStatuses.length > 0 && (
                <View className="gap-2">
                  <View className="gap-0.5">
                    <Text style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1, color: colors.brand.white }}>MUSCLE RECOVERY</Text>
                    <Text className="caption text-text-secondary">When each trained muscle should be ready to train hard again.</Text>
                  </View>
                  <View>
                    {recoveryStatuses.map((status, index) => (
                      <MuscleRecoveryRow key={status.group} status={status} index={index} />
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          ))}

        {tab === "prs" &&
          (prsWithTier.length === 0 ? (
            <Animated.View key="prs-empty" entering={FadeInUp.duration(300)} className="items-center gap-3 py-12">
              <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 120, height: 120 * (205 / 250) }} />
              <Text style={{ fontFamily: fontFamily.heading, fontSize: 26, letterSpacing: 1, color: colors.brand.white }}>NO PRS THIS SESSION</Text>
              <Text className="body-sm text-text-secondary">Beat a previous best to see it here.</Text>
            </Animated.View>
          ) : (
            <Animated.View key="prs" entering={FadeInUp.duration(300)}>
              {prsWithTier.map(({ pr, tier, topPercent, progressToNextTier }, index) => (
                <PrRow key={pr.exerciseId} pr={pr} tier={tier} unit={weightUnit} index={index} onPress={() => setSharingPr({ pr, tier, topPercent, progressToNextTier })} />
              ))}
            </Animated.View>
          ))}

        <PrimaryButton label="Go to Home" variant="ghost" hideArrow onPress={() => router.replace("/home")} />
      </ScrollView>

      <ShareCardModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} fallbackMessage={shareFallbackMessage}>
        <WorkoutShareCard workout={workout} gender={gender} />
      </ShareCardModal>

      <ShareCardModal visible={sharingPr !== null} onClose={() => setSharingPr(null)} fallbackMessage={prShareFallbackMessage}>
        {sharingPr && (
          <PrShareCard
            tier={sharingPr.tier}
            exerciseName={sharingPr.pr.exerciseName}
            weightKg={displayWeight(sharingPr.pr.weightKg, weightUnit)}
            reps={sharingPr.pr.reps}
            unit={weightUnit}
            topPercent={sharingPr.topPercent}
            progressToNextTier={sharingPr.progressToNextTier}
          />
        )}
      </ShareCardModal>
    </View>
  );
}
