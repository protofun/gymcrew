import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { EditableText } from "@/components/EditableText";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { NewPrsBanner } from "@/components/NewPrsBanner";
import { PrShareCard } from "@/components/PrShareCard";
import { RankBadge } from "@/components/RankBadge";
import { ShareCardModal } from "@/components/ShareCardModal";
import { WorkoutShareCard } from "@/components/WorkoutShareCard";
import { WorkoutStatsTabs } from "@/components/WorkoutStatsTabs";
import { images } from "@/constants/images";
import { EXERCISE_BY_ID, formatMuscleName } from "@/data/exercises";
import { formatElapsed } from "@/hooks/use-elapsed-timer";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { formatMuscleLabel } from "@/lib/muscle-groups";
import { formatReadyAt, formatRecoveryLabel, recoveryStatusForWorkout, type MuscleRecoveryStatus } from "@/lib/muscle-recovery";
import { RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { estimateOneRepMax } from "@/lib/workout-metrics";
import { estimateCalories } from "@/lib/workout-sessions";
import { warAttackScore } from "@/lib/war";
import type { WorkoutPr } from "@/lib/workout-finish";
import { workoutXpEarned } from "@/lib/xp";
import type { LoggedExercise } from "@/store/active-workout-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

/** Shown right after finishing (see `justFinished`) — the War-attack score for this workout,
 * computed instantly client-side (see lib/war.ts) since the real attack call is fire-and-forget
 * and shouldn't block finishing. `war` itself is read reactively from the store, so the standing
 * line below fills in a moment later once that call actually resolves. Renders nothing without a
 * crew (war stays null) or without any real volume to attack with. */
function WarAttackSummary({ volumeKg, prCount }: { volumeKg: number; prCount: number }) {
  const war = useCrewWarStore((state) => state.war);
  if (!war || war.status !== "active" || volumeKg <= 0) return null;

  const score = warAttackScore(volumeKg, prCount);
  const leading = war.myScore >= war.opponentScore;

  return (
    <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-yellow/15">
        <Ionicons name="flash" size={18} color={colors.brand.yellow} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary">War Attack: +{score.toLocaleString("en-US")}</Text>
        <Text className="caption text-text-secondary">
          Crew {leading ? "leads" : "trails"} {Math.round(war.myScore).toLocaleString("en-US")} vs{" "}
          {Math.round(war.opponentScore).toLocaleString("en-US")} · {war.opponent.name}
        </Text>
      </View>
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
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "exercises", label: "Exercises" },
  { key: "muscles", label: "Muscles" },
  { key: "prs", label: "PRs" },
];

function ratingFor(workout: CompletedWorkout): { emoji: string; label: string; detail: string } {
  const prCount = workout.prs.length;
  if (prCount > 0) {
    return { emoji: "🔥", label: "Monster Session!", detail: `Great intensity and ${prCount} new PR${prCount > 1 ? "s" : ""}.` };
  }
  if (workout.completedSets >= 15) return { emoji: "💪", label: "Strong Session", detail: "Solid volume today." };
  if (workout.completedSets > 0) return { emoji: "✅", label: "Workout Logged", detail: "Nice work getting it done." };
  return { emoji: "📝", label: "Session Recorded", detail: "No sets were marked complete." };
}

function StatItem({ id, icon, label, value }: { id: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1.5">
      <Ionicons name={icon} size={18} color={colors.brand.yellow} />
      <EditableText id={id} className="heading-4 text-text-primary">
        {value}
      </EditableText>
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

function VDivider() {
  return <View className="h-10 w-px bg-divider" />;
}

function ExerciseAccordionRow({ exercise, unit, hasPr }: { exercise: LoggedExercise; unit: string; hasPr: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const completedSets = exercise.sets.filter((set) => set.completed);

  return (
    <View>
      <Pressable onPress={() => setExpanded((value) => !value)} className="flex-row items-center gap-3 py-4">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="barbell-outline" size={18} color={colors.neutral.textSecondary} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <EditableText id={`workout.summary.exercise.${exercise.exerciseId}.name`} className="body-lg font-body-semibold text-text-primary">
              {exercise.name}
            </EditableText>
            {hasPr && <Ionicons name="trophy" size={14} color={colors.brand.yellow} />}
          </View>
          <EditableText id={`workout.summary.exercise.${exercise.exerciseId}.subtitle`} className="caption text-text-secondary">
            {`${completedSets.length} of ${exercise.sets.length} sets · ${formatMuscleName(exercise.primaryMuscle)}`}
          </EditableText>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.neutral.textSecondary} />
      </Pressable>

      {expanded && (
        <View className="gap-2 pb-4 pl-[52px]">
          <View className="flex-row items-center gap-2 px-1">
            <Text className="caption w-8 text-text-secondary">SET</Text>
            <Text className="caption flex-1 text-center text-text-secondary">{unit.toUpperCase()}</Text>
            <Text className="caption flex-1 text-center text-text-secondary">REPS</Text>
            <Text className="caption w-8 text-center text-text-secondary">✓</Text>
          </View>
          {exercise.sets.map((set, index) => (
            <View
              key={set.id}
              className={`flex-row items-center gap-2 rounded-lg px-1 py-2 ${set.completed ? "bg-success/20" : ""}`}
            >
              <Text className="body-sm w-8 text-text-secondary">{index + 1}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.weightKg ?? "—"}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.reps ?? "—"}</Text>
              <View className="w-8 items-center">
                <Ionicons
                  name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={set.completed ? colors.semantic.success : colors.neutral.textSecondary}
                />
              </View>
            </View>
          ))}
          {!!exercise.note && <Text className="body-sm mt-1 italic text-text-secondary">{exercise.note}</Text>}
        </View>
      )}
    </View>
  );
}

function MuscleRecoveryRow({ status }: { status: MuscleRecoveryStatus }) {
  const dotColor = status.isRecovered ? colors.semantic.success : colors.semantic.warning;
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface px-3.5 py-3">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <Text className="body-sm flex-1 font-body-semibold text-text-primary">{formatMuscleLabel(status.group)}</Text>
      <View className="items-end">
        <Text className="caption font-body-semibold" style={{ color: dotColor }}>
          {formatRecoveryLabel(status)}
        </Text>
        {status.readyAt !== null && !status.isRecovered && (
          <Text className="caption text-text-secondary">{formatReadyAt(status.readyAt)}</Text>
        )}
      </View>
    </View>
  );
}

function PrRow({ pr, tier, unit, onPress }: { pr: WorkoutPr; tier: RankTier; unit: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3"
    >
      <RankBadge tier={tier} size={44} />
      <View className="flex-1 gap-0.5">
        <EditableText id={`workout.summary.pr.${pr.exerciseId}.name`} className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {pr.exerciseName}
        </EditableText>
        <EditableText id={`workout.summary.pr.${pr.exerciseId}.detail`} className="caption text-text-secondary">
          {`${pr.weightKg}${unit} × ${pr.reps}${pr.previousBestKg !== null ? ` · +${Math.round((pr.weightKg - pr.previousBestKg) * 10) / 10}${unit}` : ""}`}
        </EditableText>
      </View>
      <Ionicons name="share-outline" size={18} color={colors.neutral.textSecondary} />
    </Pressable>
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

  const shareFallbackMessage = `${workout.name} — ${formatElapsed(workout.durationSeconds)}, ${workout.volumeKg.toLocaleString(
    "en-US",
  )} ${workout.unit} lifted across ${workout.completedSets} sets on GymCrew.`;

  const prShareFallbackMessage = sharingPr
    ? `New PR on ${sharingPr.pr.exerciseName}: ${sharingPr.pr.weightKg}${workout.unit} × ${sharingPr.pr.reps} on GymCrew! 💪`
    : "";

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Pressable onPress={handleBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Workout Summary</Text>
        <Pressable onPress={handleOpenShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.neutral.textPrimary} />
        </Pressable>
      </View>

      <View className="gap-1 px-4 pb-4">
        <EditableText id="workout.summary.name" className="body-lg font-body-semibold text-text-primary">
          {workout.name}
        </EditableText>
        <EditableText id="workout.summary.dateAndDuration" className="caption text-text-secondary">
          {`${new Date(workout.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${formatElapsed(workout.durationSeconds)}`}
        </EditableText>
      </View>

      {/* Only shown right after finishing (see `justFinished` above) — this is what used to be its
          own screen (workout/complete.tsx). Folding it in here cuts a full screen out of every
          "finish workout" flow and puts the exercise/muscle breakdown one scroll away instead of
          one tab-and-a-screen away. */}
      {justFinished === "1" &&
        (workout.prs.length > 0 ? (
          <View className="mx-4 mb-4">
            <NewPrsBanner
              count={workout.prs.length}
              topTier={topTier ?? "rookie"}
              exerciseNames={workout.prs.map((pr) => pr.exerciseName)}
              xpEarned={xpEarned}
            />
          </View>
        ) : (
          <View className="mx-4 mb-4 flex-row items-center gap-4">
            <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 110, height: 110 * (205 / 250) }} />
            <View className="flex-1 gap-1.5">
              <Text className="heading-3 text-text-primary">Workout Complete!</Text>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flame" size={16} color={colors.semantic.streak} />
                <EditableText id="workout.summary.celebrationName" className="body-lg font-body-semibold text-text-secondary">
                  {workout.name}
                </EditableText>
              </View>
            </View>
          </View>
        ))}

      {justFinished === "1" && <WarAttackSummary volumeKg={workout.volumeKg} prCount={workout.prs.length} />}

      <View className="flex-row gap-6 border-b border-divider px-4">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center gap-2 py-3">
              <Text className={`body-md font-body-semibold ${active ? "text-brand-yellow" : "text-text-secondary"}`}>
                {t.label}
              </Text>
              <View className={`h-0.5 w-full rounded-full ${active ? "bg-brand-yellow" : "bg-transparent"}`} />
            </Pressable>
          );
        })}
      </View>

      {/* contentContainerStyle is all-inline here, not contentContainerClassName — mixing the two
          is unreliable on native with this project's NativeWind preview version (same class of bug
          as the TextInput textAlign crash: works on web, silently drops or conflicts on native). */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 32, paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "overview" && (
          <>
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <StatItem id="workout.summary.duration" icon="time-outline" label="Duration" value={formatElapsed(workout.durationSeconds)} />
                <VDivider />
                <StatItem id="workout.summary.volume" icon="barbell-outline" label="Volume" value={`${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`} />
                <VDivider />
                <StatItem id="workout.summary.sets" icon="layers-outline" label="Sets" value={String(workout.completedSets)} />
              </View>
              <View className="flex-row items-center">
                <StatItem id="workout.summary.prs" icon="trophy-outline" label="PRs" value={String(workout.prs.length)} />
                <VDivider />
                <StatItem id="workout.summary.calories" icon="flame-outline" label="Calories" value={`~${calories}`} />
              </View>
            </View>

            {topLift && (
              <View className="flex-row items-center gap-2 rounded-xl border border-divider bg-surface px-3 py-2.5">
                <Ionicons name="star" size={14} color={colors.brand.yellow} />
                <Text className="body-sm flex-1 text-text-secondary" numberOfLines={1}>
                  <Text className="font-body-semibold text-text-primary">Top lift: {topLift.name}</Text> — {topLift.weightKg}
                  {workout.unit} × {topLift.reps} (est. 1RM {estimateOneRepMax(topLift.weightKg, topLift.reps)}
                  {workout.unit})
                </Text>
              </View>
            )}

            {workout.prs.length > 0 && (
              <Pressable
                onPress={() => router.push("/profile/achievements")}
                className="flex-row items-center justify-center gap-1.5 py-1"
              >
                <Text className="body-sm font-body-semibold text-brand-yellow">View all your PRs</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brand.yellow} />
              </Pressable>
            )}

            {!justFinished && (
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 28 }}>{rating.emoji}</Text>
                <View className="flex-1 gap-0.5">
                  <Text className="body-md font-body-semibold text-text-primary">{rating.label}</Text>
                  <Text className="body-sm text-text-secondary">{rating.detail}</Text>
                </View>
              </View>
            )}

            <WorkoutStatsTabs workout={workout} workouts={allWorkouts} bodyWeightKg={bodyWeightKg} />

            <View className="gap-2">
              <Text className="body-sm text-text-secondary">Notes</Text>
              <TextInput
                value={workout.notes}
                onChangeText={(text) => updateWorkoutNotes(workout!.id, text)}
                placeholder="How did this workout feel?"
                placeholderTextColor={colors.neutral.textSecondary}
                multiline
                className="body-md rounded-xl bg-surface px-4 py-3 text-text-primary"
                style={{ minHeight: 90, textAlignVertical: "top" }}
              />
            </View>
          </>
        )}

        {tab === "exercises" &&
          (workout.exercises.length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No exercises logged.</Text>
          ) : (
            <View className="-mt-4">
              {workout.exercises.map((exercise, index) => (
                <View key={exercise.exerciseId}>
                  {index > 0 && <View className="h-px bg-divider" />}
                  <ExerciseAccordionRow exercise={exercise} unit={workout.unit} hasPr={prExerciseIds.has(exercise.exerciseId)} />
                </View>
              ))}
            </View>
          ))}

        {tab === "muscles" &&
          (Object.keys(workout.muscleIntensity).length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No muscle data for this workout.</Text>
          ) : (
            <View className="gap-6">
              <View className="items-center">
                <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={300} gender={gender} />
              </View>

              {recoveryStatuses.length > 0 && (
                <View className="gap-2.5">
                  <View className="gap-0.5">
                    <Text className="body-md font-body-semibold text-text-primary">Muscle Recovery</Text>
                    <Text className="caption text-text-secondary">When each trained muscle should be ready to train hard again.</Text>
                  </View>
                  <View className="gap-2">
                    {recoveryStatuses.map((status) => (
                      <MuscleRecoveryRow key={status.group} status={status} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))}

        {tab === "prs" &&
          (prsWithTier.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-dashed border-divider py-14">
              <Ionicons name="trophy-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">No PRs this session.</Text>
              <Text className="body-sm text-text-secondary">Beat a previous best to see it here.</Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {prsWithTier.map(({ pr, tier, topPercent, progressToNextTier }) => (
                <PrRow
                  key={pr.exerciseId}
                  pr={pr}
                  tier={tier}
                  unit={workout.unit}
                  onPress={() => setSharingPr({ pr, tier, topPercent, progressToNextTier })}
                />
              ))}
            </View>
          ))}

        <Pressable
          onPress={() => router.replace("/home")}
          className="flex-row items-center justify-center gap-2 rounded-full border border-divider py-4"
        >
          <Ionicons name="home-outline" size={18} color={colors.neutral.textPrimary} />
          <Text className="body-md font-body-semibold text-text-primary">Go to Home</Text>
        </Pressable>
      </ScrollView>

      <ShareCardModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} fallbackMessage={shareFallbackMessage}>
        <WorkoutShareCard workout={workout} gender={gender} />
      </ShareCardModal>

      <ShareCardModal visible={sharingPr !== null} onClose={() => setSharingPr(null)} fallbackMessage={prShareFallbackMessage}>
        {sharingPr && (
          <PrShareCard
            tier={sharingPr.tier}
            exerciseName={sharingPr.pr.exerciseName}
            weightKg={sharingPr.pr.weightKg}
            reps={sharingPr.pr.reps}
            unit={workout.unit}
            topPercent={sharingPr.topPercent}
            progressToNextTier={sharingPr.progressToNextTier}
          />
        )}
      </ShareCardModal>
    </View>
  );
}
