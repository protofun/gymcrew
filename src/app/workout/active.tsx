import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { WorkoutLogger } from "@/components/WorkoutLogger";
import { WorkoutSettingsModal } from "@/components/WorkoutSettingsModal";
import { formatElapsed, useElapsedTimer } from "@/hooks/use-elapsed-timer";
import { checkPersonalRecords, computeCompletedSets, computeMuscleIntensity, computeVolumeKg } from "@/lib/workout-finish";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  // Lazy init from the store directly (not the `exercises` selector below, which isn't declared
  // yet) — if the workout arrived pre-populated (e.g. started from a template), the first exercise
  // starts expanded instead of everything being collapsed with nothing marked as active.
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    () => useActiveWorkoutStore.getState().exercises[0]?.exerciseId ?? null,
  );

  const startedAt = useActiveWorkoutStore((state) => state.startedAt);
  const name = useActiveWorkoutStore((state) => state.name);
  const unit = useActiveWorkoutStore((state) => state.unit);
  const exercises = useActiveWorkoutStore((state) => state.exercises);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const setUnit = useActiveWorkoutStore((state) => state.setUnit);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);
  const removeExercise = useActiveWorkoutStore((state) => state.removeExercise);
  const replaceExercise = useActiveWorkoutStore((state) => state.replaceExercise);
  const setExerciseNote = useActiveWorkoutStore((state) => state.setExerciseNote);
  const addSet = useActiveWorkoutStore((state) => state.addSet);
  const removeSet = useActiveWorkoutStore((state) => state.removeSet);
  const updateSet = useActiveWorkoutStore((state) => state.updateSet);
  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const finishWorkout = useActiveWorkoutStore((state) => state.finishWorkout);

  const elapsedSeconds = useElapsedTimer(startedAt);
  const hasProgress = exercises.length > 0;
  const posthog = usePostHog();

  function handleFinish() {
    const id = `workout-${Date.now()}`;
    const prs = checkPersonalRecords(exercises);
    const volumeKg = computeVolumeKg(exercises);
    const completedSets = computeCompletedSets(exercises);

    useWorkoutHistoryStore.getState().addWorkout({
      id,
      name: name.trim() || "Workout",
      completedAt: Date.now(),
      durationSeconds: elapsedSeconds,
      unit,
      notes: "",
      exercises,
      muscleIntensity: computeMuscleIntensity(exercises),
      volumeKg,
      completedSets,
      prs,
    });

    posthog.capture("workout_completed", {
      workout_name: name.trim() || "Workout",
      duration_seconds: elapsedSeconds,
      exercise_count: exercises.length,
      completed_sets: completedSets,
      volume_kg: volumeKg,
      pr_count: prs.length,
      unit,
    });

    finishWorkout();
    router.replace({ pathname: "/workout/complete", params: { id } });
  }

  function confirmDiscard(onConfirm: () => void) {
    if (!hasProgress) {
      onConfirm();
      return;
    }
    Alert.alert("Discard this workout?", "Everything you've logged so far will be lost. This can't be undone.", [
      { text: "Keep Going", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onConfirm },
    ]);
  }

  function handleClose() {
    confirmDiscard(() => {
      posthog.capture("workout_discarded", {
        exercise_count: exercises.length,
        duration_seconds: elapsedSeconds,
        source: "close_button",
      });
      discardWorkout();
      router.back();
    });
  }

  function handleDiscardFromSettings() {
    setSettingsVisible(false);
    confirmDiscard(() => {
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

      {/* contentContainerStyle is all-inline here, not contentContainerClassName — mixing the two
          is unreliable on native with this project's NativeWind preview version (same class of bug
          as the TextInput textAlign crash: works on web, silently drops or conflicts on native). */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 110 }}
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

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
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
      />

      <WorkoutSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        name={name}
        onChangeName={setName}
        unit={unit}
        onChangeUnit={setUnit}
        onDiscard={handleDiscardFromSettings}
      />
    </View>
  );
}
