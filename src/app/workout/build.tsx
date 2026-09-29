import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { HOME_EYEBROW, HOME_ROW_DETAIL, HOME_ROW_TITLE } from "@/components/homeStyle";
import { HomeRowLead } from "@/components/HomeRowLead";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RankBadge } from "@/components/RankBadge";
import { WorkoutOptionsSheet } from "@/components/WorkoutOptionsSheet";
import { WorkoutTemplateCard } from "@/components/WorkoutTemplateCard";
import { EXERCISE_BY_ID, type Exercise, formatMuscleName } from "@/data/exercises";
import { tierForExercise } from "@/lib/generic-lift-rank";
import { buildLiftRankCards } from "@/lib/lift-rank-cards";
import type { RankProfile } from "@/lib/rank";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { type CustomWorkout, useCustomWorkoutsStore } from "@/store/custom-workouts-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { usePersonalRecordsStore } from "@/store/personal-records-store";
import { colors, fontFamily } from "@/theme";

function BuilderExerciseRow({ exercise, onRemove }: { exercise: Exercise; onRemove: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-divider py-3">
      {exercise.imageUrl ? (
        <Image source={{ uri: exercise.imageUrl }} className="h-11 w-11 rounded-full bg-surface" />
      ) : (
        <HomeRowLead kind="flat">
          <Ionicons name="barbell-outline" size={18} color={colors.neutral.textSecondary} />
        </HomeRowLead>
      )}
      <View className="flex-1 gap-0.5">
        <Text style={[HOME_ROW_TITLE, { fontSize: 16, lineHeight: 18 }]}>{exercise.name.toUpperCase()}</Text>
        {!!exercise.primaryMuscles[0] && <Text style={[HOME_ROW_DETAIL, { color: colors.brand.yellow }]}>{formatMuscleName(exercise.primaryMuscles[0])}</Text>}
      </View>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={20} color={colors.neutral.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function BuildWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"list" | "create">("list");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftExercises, setDraftExercises] = useState<Exercise[]>([]);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [optionsFor, setOptionsFor] = useState<CustomWorkout | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const customWorkouts = useCustomWorkoutsStore((state) => state.workouts);
  const addCustomWorkout = useCustomWorkoutsStore((state) => state.addWorkout);
  const updateCustomWorkout = useCustomWorkoutsStore((state) => state.updateWorkout);
  const removeCustomWorkout = useCustomWorkoutsStore((state) => state.removeWorkout);

  const gender = useOnboardingStore((state) => state.onboarding.gender) ?? "male";
  const weightKg = useOnboardingStore((state) => state.onboarding.weightKg) ?? 85;
  const age = useOnboardingStore((state) => state.onboarding.age);
  const records = usePersonalRecordsStore((state) => state.records);
  const profile: RankProfile = useMemo(() => ({ gender, bodyWeightKg: weightKg, age }), [gender, weightKg, age]);
  const cards = useMemo(() => buildLiftRankCards(records, profile, "gym"), [records, profile]);

  const discardWorkout = useActiveWorkoutStore((state) => state.discardWorkout);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);

  function resetDraft() {
    setDraftName("");
    setDraftExercises([]);
    setEditingWorkoutId(null);
  }

  function handleStartExisting(name: string, exerciseIds: string[]) {
    // Starting a saved workout always starts fresh — discard first since `startWorkout` now
    // leaves an already-in-progress workout untouched rather than overwriting it (see
    // active-workout-store.ts).
    discardWorkout();
    startWorkout();
    setName(name);
    for (const exerciseId of exerciseIds) {
      const exercise = EXERCISE_BY_ID[exerciseId];
      if (exercise) addExercise(exercise);
    }
    router.replace("/workout/active");
  }

  function handleEditExisting(workout: CustomWorkout) {
    setOptionsFor(null);
    setDraftName(workout.name);
    setDraftExercises(workout.exerciseIds.map((id) => EXERCISE_BY_ID[id]).filter((e): e is Exercise => !!e));
    setEditingWorkoutId(workout.id);
    setMode("create");
  }

  // `Alert.alert` with multiple buttons never shows a dialog on React Native Web (see
  // `ConfirmModal`'s own doc comment, and `workout/active.tsx`'s discard-workout confirm for the
  // same fix) — on the web/PWA build this made "Delete" on a saved workout silently do nothing.
  function handleDeleteExisting(id: string, name: string) {
    setOptionsFor(null);
    setPendingDelete({ id, name });
  }

  function persistDraft(): string | null {
    if (!draftName.trim() || draftExercises.length === 0) return null;
    const exerciseIds = draftExercises.map((e) => e.id);
    if (editingWorkoutId) {
      updateCustomWorkout(editingWorkoutId, draftName.trim(), exerciseIds);
    } else {
      addCustomWorkout(draftName.trim(), exerciseIds);
    }
    return draftName.trim();
  }

  function handleSaveDraft() {
    if (!persistDraft()) return;
    resetDraft();
    setMode("list");
  }

  function handleSaveAndStart() {
    const name = persistDraft();
    if (!name) return;
    discardWorkout();
    startWorkout();
    setName(name);
    for (const exercise of draftExercises) addExercise(exercise);
    resetDraft();
    router.replace("/workout/active");
  }

  const canSave = draftName.trim().length > 0 && draftExercises.length > 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable
          onPress={() => {
            if (mode === "create") {
              resetDraft();
              setMode("list");
            } else {
              goBack();
            }
          }}
          hitSlop={8}
          style={{ position: "absolute", left: 16 }}
        >
          <Ionicons name={mode === "create" ? "arrow-back" : "close"} size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">
          {mode === "create" ? (editingWorkoutId ? "Edit Workout" : "New Workout") : "Build Workout"}
        </Text>
      </View>

      {mode === "list" ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => setMode("create")}
            style={{ borderRadius: 24, backgroundColor: colors.neutral.surfaceElevated }}
            className="flex-row items-center gap-3 p-4"
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand.yellow }} className="items-center justify-center">
              <Ionicons name="add" size={24} color={colors.brand.iron} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text style={[HOME_ROW_TITLE, { fontSize: 16 }]}>CREATE NEW WORKOUT</Text>
              <Text style={HOME_ROW_DETAIL}>Pick your own exercises and save it for next time</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
          </Pressable>

          {customWorkouts.length === 0 ? (
            <View className="items-center gap-2 py-10">
              <Ionicons name="construct-outline" size={28} color={colors.neutral.textSecondary} />
              <Text className="body-md text-center text-text-secondary">
                Build your own workout by picking exercises — it&apos;ll be saved here so you can quick-start it anytime.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text style={HOME_EYEBROW}>MY WORKOUTS</Text>
              <View>
                {customWorkouts.map((workout) => (
                  <WorkoutTemplateCard
                    key={workout.id}
                    template={{ key: workout.id, name: workout.name, icon: "construct-outline", exerciseIds: workout.exerciseIds }}
                    onPress={() => handleStartExisting(workout.name, workout.exerciseIds)}
                    onLongPress={() => setOptionsFor(workout)}
                  />
                ))}
              </View>
              <Text className="caption text-center text-text-secondary">Hold a workout to edit or delete it</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-1.5">
              <Text style={HOME_EYEBROW}>WORKOUT NAME</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="e.g. My Push Day"
                placeholderTextColor={colors.neutral.textSecondary}
                style={{ borderRadius: 16, backgroundColor: colors.neutral.surfaceElevated }}
                className="body-md px-4 py-3.5 text-text-primary"
              />
            </View>

            <View className="gap-3">
              {draftExercises.map((exercise, index) => (
                <BuilderExerciseRow
                  key={`${exercise.id}-${index}`}
                  exercise={exercise}
                  onRemove={() => setDraftExercises((prev) => prev.filter((_, i) => i !== index))}
                />
              ))}
            </View>

            <Pressable
              onPress={() => setPickerVisible(true)}
              style={{ borderRadius: 16, borderColor: colors.brand.yellow }}
              className="flex-row items-center justify-center gap-1.5 border py-3.5"
            >
              <Ionicons name="add" size={18} color={colors.brand.yellow} />
              <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.brand.yellow }}>ADD EXERCISE</Text>
            </Pressable>
          </ScrollView>

          <View
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: insets.bottom + 12,
              gap: 10,
            }}
          >
            <PrimaryButton label="Save & Start Now" onPress={handleSaveAndStart} disabled={!canSave} />
            <Pressable onPress={handleSaveDraft} disabled={!canSave} className="items-center py-1">
              <Text className={`body-md font-body-semibold ${canSave ? "text-text-primary" : "text-text-secondary"}`}>
                Just Save for Later
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(exercise) => {
          setDraftExercises((prev) => [...prev, exercise]);
          setPickerVisible(false);
        }}
        renderLeading={(exercise) => <RankBadge tier={tierForExercise(exercise, cards, records, profile)} size={34} />}
      />

      <WorkoutOptionsSheet
        visible={optionsFor !== null}
        workoutName={optionsFor?.name ?? ""}
        onClose={() => setOptionsFor(null)}
        onEdit={() => optionsFor && handleEditExisting(optionsFor)}
        onDelete={() => optionsFor && handleDeleteExisting(optionsFor.id, optionsFor.name)}
      />

      <ConfirmModal
        visible={pendingDelete !== null}
        title="Delete workout?"
        message={pendingDelete ? `"${pendingDelete.name}" will be removed from your saved workouts.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) removeCustomWorkout(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}
