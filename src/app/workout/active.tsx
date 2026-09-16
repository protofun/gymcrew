import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { ConfirmModal } from "@/components/ConfirmModal";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { RankBadge } from "@/components/RankBadge";
import { RestTimerBanner } from "@/components/RestTimerBanner";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { WorkoutSettingsModal } from "@/components/WorkoutSettingsModal";
import { formatElapsed, useElapsedTimer } from "@/hooks/use-elapsed-timer";
import { recordChallengeContributions } from "@/lib/challenge-progress";
import { fromDateKey, toDateKey } from "@/lib/date";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import { reconcileNotificationSchedules } from "@/lib/push-notifications";
import type { RankProfile } from "@/lib/rank";
import { computeCurrentStreak } from "@/lib/streak";
import { checkPersonalRecords, computeCompletedSets, computeMuscleIntensity, computeVolumeKg } from "@/lib/workout-finish";
import { workoutXpEarned } from "@/lib/xp";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useCrewFeedStore } from "@/store/crew-feed-store";
import { useCrewWarStore } from "@/store/crew-war-store";
import { TOKENS_PER_PR, TOKENS_PER_WORKOUT, useCurrencyStore } from "@/store/currency-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { useProfileLevelStore } from "@/store/profile-level-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

/** How long to wait after the last edit before pushing to the crew's shared live session — logging
 * a set is many quick edits in a row (weight, then reps, then complete), no need to push every one. */
const CREW_LIVE_SESSION_PUSH_DEBOUNCE_MS = 2000;

/** Streak lengths worth a crew-feed nudge — only fires the moment one is first crossed, not on
 * every workout past it (see handleFinish's streakBefore/streakAfter comparison). */
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
/** A session this long is genuinely notable, not just a normal workout — see crew-feed-store.ts. */
const LONG_SESSION_MINUTES = 75;

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { leadingCrew } = useLocalSearchParams<{ leadingCrew?: string }>();
  const isLeadingCrew = leadingCrew === "1";
  const [pickerVisible, setPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  // Measured, not guessed — the footer's real height changes when the rest timer banner appears
  // (see RestTimerBanner), and a fixed padding sized for the button alone left the rest-timer case
  // undersized, leaving the last set row's controls (e.g. the remove-set ⊗) sitting underneath the
  // footer's touch area, unpressable. 170 is just the pre-measurement fallback for the first frame.
  const [footerHeight, setFooterHeight] = useState(170);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<(() => void) | null>(null);
  // Lazy init from the store directly (not the `exercises` selector below, which isn't declared
  // yet) — if the workout arrived pre-populated (e.g. started from a template), the first exercise
  // starts expanded instead of everything being collapsed with nothing marked as active.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    () => useActiveWorkoutStore.getState().exercises[0]?.exerciseId ?? null,
  );

  const startedAt = useActiveWorkoutStore((state) => state.startedAt);
  const logDateKey = useActiveWorkoutStore((state) => state.logDateKey);
  const name = useActiveWorkoutStore((state) => state.name);
  const unit = useActiveWorkoutStore((state) => state.unit);
  const exercises = useActiveWorkoutStore((state) => state.exercises);
  const restEndTime = useActiveWorkoutStore((state) => state.restEndTime);
  const restDurationSeconds = useActiveWorkoutStore((state) => state.restDurationSeconds);
  const autoFillPreviousSet = useActiveWorkoutStore((state) => state.autoFillPreviousSet);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const setUnit = useActiveWorkoutStore((state) => state.setUnit);
  const setRestDurationSeconds = useActiveWorkoutStore((state) => state.setRestDurationSeconds);
  const setAutoFillPreviousSet = useActiveWorkoutStore((state) => state.setAutoFillPreviousSet);
  const stopRest = useActiveWorkoutStore((state) => state.stopRest);
  const addRestSeconds = useActiveWorkoutStore((state) => state.addRestSeconds);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);
  const removeExercise = useActiveWorkoutStore((state) => state.removeExercise);
  const replaceExercise = useActiveWorkoutStore((state) => state.replaceExercise);
  const setExerciseNote = useActiveWorkoutStore((state) => state.setExerciseNote);
  const addSet = useActiveWorkoutStore((state) => state.addSet);
  const removeSet = useActiveWorkoutStore((state) => state.removeSet);
  const updateSet = useActiveWorkoutStore((state) => state.updateSet);
  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const finishWorkout = useActiveWorkoutStore((state) => state.finishWorkout);

  const pushLiveSessionExercises = useLedWorkoutStore((state) => state.pushExercises);
  const endLiveSession = useLedWorkoutStore((state) => state.endSession);

  const elapsedSeconds = useElapsedTimer(startedAt);
  const hasProgress = exercises.length > 0;
  const posthog = usePostHog();
  // Only a workout logged for today can earn XP/streaks/PRs/Crew War points — otherwise backfilling
  // every past day would be a free way to farm all of them. See "Log a Past Workout" on the Log tab.
  const isBackfilled = logDateKey !== toDateKey(new Date());

  // Mirrors whatever the leader actually logs to the crew's shared live session, debounced — see
  // led-workout-store.ts. No-op (via pushExercises' own guard) once the session's ended, and for
  // every joiner who isn't leading.
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLeadingCrew) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushLiveSessionExercises(exercises), CREW_LIVE_SESSION_PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [isLeadingCrew, exercises, pushLiveSessionExercises]);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const rankProfile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const rankCards = useMemo(() => buildLiftRankCards(records, rankProfile, "gym"), [records, rankProfile]);

  function handleFinish() {
    const id = `workout-${Date.now()}`;
    // Snapshot records before they're updated below — capping a challenge contribution against a
    // PR set in this same workout would let a fabricated set validate itself.
    const recordsBeforeThisWorkout = usePersonalRecordsStore.getState().records;
    // A backfilled workout (see isBackfilled above) never checks/updates PRs — otherwise claiming a
    // huge lift on some past day would let anyone rank up instantly with nothing to disprove it.
    const prs = isBackfilled ? [] : checkPersonalRecords(exercises);
    const volumeKg = computeVolumeKg(exercises);
    const completedSets = computeCompletedSets(exercises);
    if (!isBackfilled) recordChallengeContributions(exercises, recordsBeforeThisWorkout);

    // Snapshot the streak before this workout lands, so crossing a milestone (3/7/14/... days) can
    // be detected and nudged to the crew feed exactly once — not on every workout past it. Skipped
    // entirely for a backfilled workout, which never touches the streak (see streak.ts).
    const freezeDateKeys = useCurrencyStore.getState().freezeDateKeys;
    const workoutsBeforeThis = useWorkoutHistoryStore.getState().workouts;
    const streakBefore = isBackfilled ? 0 : computeCurrentStreak(workoutsBeforeThis, new Date(), freezeDateKeys);

    // A backfilled workout's completedAt is the day it's for (midday, to sit safely inside that
    // local calendar day) instead of the moment "Finish" was tapped — see toDateKey usages across
    // streak.ts / crew-league.ts / challenge-progress.ts that bucket workouts by this timestamp.
    const completedAt = isBackfilled ? fromDateKey(logDateKey).setHours(12, 0, 0, 0) : Date.now();

    useWorkoutHistoryStore.getState().addWorkout({
      id,
      name: name.trim() || "Workout",
      completedAt,
      durationSeconds: elapsedSeconds,
      unit,
      notes: "",
      exercises,
      muscleIntensity: computeMuscleIntensity(exercises),
      volumeKg,
      completedSets,
      prs,
      isBackfilled,
    });

    posthog.capture("workout_completed", {
      workout_name: name.trim() || "Workout",
      duration_seconds: elapsedSeconds,
      exercise_count: exercises.length,
      completed_sets: completedSets,
      volume_kg: volumeKg,
      pr_count: prs.length,
      unit,
      is_backfilled: isBackfilled,
    });

    // Everything below is how a same-day workout earns something — XP, tokens, Crew War points, and
    // crew-feed nudges. None of it runs for a backfilled workout, or "log every day I skipped" would
    // be a free way to farm all of them.
    if (!isBackfilled) {
      const currency = useCurrencyStore.getState();
      const xpEarned = workoutXpEarned(prs.length);
      useProfileLevelStore.getState().addXp(currency.xpBoostActive ? xpEarned * 2 : xpEarned);
      currency.grantTokens(TOKENS_PER_WORKOUT + prs.length * TOKENS_PER_PR);
      if (currency.xpBoostActive) currency.consumeXpBoost();

      // Real crew-vs-crew War attack + the crew-internal motivation feed — all best-effort, no-ops
      // without a crew (see crew-war-store.ts / crew-feed-store.ts). Fire-and-forget: finishing a
      // workout shouldn't wait on a network round trip — see lib/war.ts for the instant preview shown
      // on the summary screen right after this.
      const crewFeed = useCrewFeedStore.getState();
      useCrewWarStore.getState().attack(volumeKg, prs.length, name.trim() || "Workout");
      for (const pr of prs) {
        crewFeed.logEvent("pr", { exerciseId: pr.exerciseId, exerciseName: pr.exerciseName, weightKg: pr.weightKg, reps: pr.reps });
      }
      const streakAfter = computeCurrentStreak(useWorkoutHistoryStore.getState().workouts, new Date(), freezeDateKeys);
      if (STREAK_MILESTONES.some((milestone) => streakBefore < milestone && streakAfter >= milestone)) {
        crewFeed.logEvent("streak", { days: streakAfter });
      }
      if (elapsedSeconds >= LONG_SESSION_MINUTES * 60) {
        crewFeed.logEvent("long_session", { durationMinutes: Math.round(elapsedSeconds / 60), workoutName: name.trim() || "Workout" });
      }

      // Cancels today's streak-loss nudge immediately (it'd otherwise still fire at 20:00 even
      // though the streak's now safe) and refreshes the weekly-recap/stronger-progress content
      // with this workout's data. Fire-and-forget, same as the crew calls just above.
      reconcileNotificationSchedules();
    }

    if (isLeadingCrew) endLiveSession();
    finishWorkout();
    // PR or not, this always lands on the results screen — `workout/complete` no longer exists as
    // its own stop; `justFinished` tells the results screen to show its "just finished" hero.
    if (prs.length > 0) {
      router.replace({ pathname: "/workout/pr-celebration", params: { id } });
    } else {
      router.replace({ pathname: "/workout/summary", params: { id, justFinished: "1" } });
    }
  }

  // `Alert.alert` with multiple buttons never shows a dialog on React Native Web (see
  // ConfirmModal's own doc comment) — on the PWA this made the close button silently do nothing
  // the moment there was progress to discard, since that's exactly the path that used to call
  // Alert.alert. ConfirmModal is the cross-platform replacement.
  function confirmDiscard(onConfirm: () => void) {
    if (!hasProgress) {
      onConfirm();
      return;
    }
    setPendingDiscardAction(() => onConfirm);
  }

  function handleClose() {
    confirmDiscard(() => {
      posthog.capture("workout_discarded", {
        exercise_count: exercises.length,
        duration_seconds: elapsedSeconds,
        source: "close_button",
      });
      if (isLeadingCrew) endLiveSession();
      discardWorkout();
      // `router.back()` alone silently does nothing without real navigation history — e.g. a hard
      // refresh on the web/PWA build while already on this screen resets it, leaving "Discard"
      // looking like it does nothing (the workout IS reset underneath, just stuck on this screen).
      // Same fix as the workout-split screen's back button.
      if (router.canGoBack()) router.back();
      else router.replace("/log");
    });
  }

  function handleDiscardFromSettings() {
    setSettingsVisible(false);
    confirmDiscard(() => {
      if (isLeadingCrew) endLiveSession();
      posthog.capture("workout_discarded", {
        exercise_count: exercises.length,
        duration_seconds: elapsedSeconds,
        source: "settings",
      });
      discardWorkout();
      router.replace("/log");
    });
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-between border-b border-divider px-4 pb-4 pt-1">
        <Pressable onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.neutral.textPrimary} />
        </Pressable>

        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => setSettingsVisible(true)} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={colors.neutral.textSecondary} />
          </Pressable>
          <Pressable onPress={handleFinish} className="rounded-full bg-brand-yellow px-5 py-2.5">
            <Text className="body-sm font-body-semibold text-brand-iron">Finish</Text>
          </Pressable>
        </View>

        {/* Absolutely centered on the full row so it stays put regardless of how wide the side content is. */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={16} color={colors.brand.yellow} />
            <Text className="body-lg font-body-semibold text-text-primary">{formatElapsed(elapsedSeconds)}</Text>
          </View>
        </View>
      </View>

      {isBackfilled && (
        <View className="flex-row items-center gap-2 border-b border-divider bg-surface px-4 py-2.5">
          <Ionicons name="calendar-outline" size={14} color={colors.neutral.textSecondary} />
          <Text className="caption text-text-secondary">
            {`Logging for ${fromDateKey(logDateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — won't count toward XP, streaks, PRs, or Crew War`}
          </Text>
        </View>
      )}

      {/* contentContainerStyle is all-inline here, not contentContainerClassName — mixing the two
          is unreliable on native with this project's NativeWind preview version (same class of bug
          as the TextInput textAlign crash: works on web, silently drops or conflicts on native). */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: footerHeight + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.length === 0 ? (
          <View className="items-center gap-3 rounded-2xl border border-dashed border-divider py-14">
            <Ionicons name="barbell-outline" size={32} color={colors.neutral.textSecondary} />
            <Text className="body-md text-text-secondary">Add your first exercise to get started</Text>
          </View>
        ) : (
          exercises.map((exercise) => (
            <WorkoutLogger
              key={exercise.exerciseId}
              exercise={exercise}
              unit={unit}
              expanded={expandedExerciseId === exercise.exerciseId}
              onToggleExpand={() =>
                setExpandedExerciseId((current) => (current === exercise.exerciseId ? null : exercise.exerciseId))
              }
              onRemoveExercise={() => removeExercise(exercise.exerciseId)}
              onReplaceExercise={() => setReplacingExerciseId(exercise.exerciseId)}
              onSetNote={(note) => setExerciseNote(exercise.exerciseId, note)}
              onAddSet={() => addSet(exercise.exerciseId)}
              onRemoveSet={(setId) => removeSet(exercise.exerciseId, setId)}
              onUpdateSet={(setId, updates) => updateSet(exercise.exerciseId, setId, updates)}
            />
          ))
        )}
      </ScrollView>

      <View
        style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height + insets.bottom + 12)}
      >
        <RestTimerBanner
          restEndTime={restEndTime}
          restDurationSeconds={restDurationSeconds}
          onAddSeconds={addRestSeconds}
          onStop={stopRest}
        />

        <Pressable
          onPress={() => setPickerVisible(true)}
          className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Ionicons name="add" size={20} color={colors.brand.iron} />
          <Text className="body-lg font-body-semibold text-brand-iron">Add Exercise</Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(exercise) => {
          addExercise(exercise);
          setExpandedExerciseId(exercise.id);
          setPickerVisible(false);
          posthog.capture("exercise_added", {
            exercise_name: exercise.name,
            primary_muscle: exercise.primaryMuscles[0],
            exercise_count: exercises.length + 1,
          });
        }}
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, rankCards, records, rankProfile)} size={34} />}
      />

      <ExercisePickerModal
        visible={replacingExerciseId !== null}
        title="Replace Exercise"
        onClose={() => setReplacingExerciseId(null)}
        onSelect={(exercise) => {
          if (replacingExerciseId) replaceExercise(replacingExerciseId, exercise);
          setExpandedExerciseId(exercise.id);
          setReplacingExerciseId(null);
        }}
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, rankCards, records, rankProfile)} size={34} />}
      />

      <WorkoutSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        name={name}
        onChangeName={setName}
        unit={unit}
        onChangeUnit={setUnit}
        restDurationSeconds={restDurationSeconds}
        onChangeRestDurationSeconds={setRestDurationSeconds}
        autoFillPreviousSet={autoFillPreviousSet}
        onChangeAutoFillPreviousSet={setAutoFillPreviousSet}
        onDiscard={handleDiscardFromSettings}
      />

      <ConfirmModal
        visible={pendingDiscardAction !== null}
        title="Discard this workout?"
        message="Everything you've logged so far will be lost. This can't be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          const action = pendingDiscardAction;
          setPendingDiscardAction(null);
          action?.();
        }}
        onCancel={() => setPendingDiscardAction(null)}
      />
    </View>
  );
}
