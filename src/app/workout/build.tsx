import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { WorkoutOptionsSheet } from "@/components/WorkoutOptionsSheet";
import { WorkoutTemplateCard } from "@/components/WorkoutTemplateCard";
import { EXERCISE_BY_ID, type Exercise, formatMuscleName } from "@/data/exercises";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { type CustomWorkout, useCustomWorkoutsStore } from "@/store/custom-workouts-store";
import { colors } from "@/theme";

function BuilderExerciseRow({ exercise, onRemove }: { exercise: Exercise; onRemove: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      {exercise.imageUrl ? (
        <Image source={{ uri: exercise.imageUrl }} className="h-12 w-12 rounded-xl bg-background" />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-background">
          <Ionicons name="barbell-outline" size={20} color={colors.neutral.textSecondary} />
        </View>
      )}
      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary">{exercise.name}</Text>
        {!!exercise.primaryMuscles[0] && (
          <Text className="caption text-brand-yellow">{formatMuscleName(exercise.primaryMuscles[0])}</Text>
        )}
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

  const customWorkouts = useCustomWorkoutsStore((state) => state.workouts);
  const addCustomWorkout = useCustomWorkoutsStore((state) => state.addWorkout);
  const updateCustomWorkout = useCustomWorkoutsStore((state) => state.updateWorkout);
  const removeCustomWorkout = useCustomWorkoutsStore((state) => state.removeWorkout);

  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);

  function resetDraft() {
    setDraftName("");
    setDraftExercises([]);
    setEditingWorkoutId(null);
  }

  function handleStartExisting(name: string, exerciseIds: string[]) {
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

  function handleDeleteExisting(id: string, name: string) {
    setOptionsFor(null);
    Alert.alert("Delete workout?", `"${name}" will be removed from your saved workouts.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeCustomWorkout(id) },
    ]);
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
              router.back();
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
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-yellow py-4"
          >
            <Ionicons name="add-circle" size={20} color={colors.brand.yellow} />
            <Text className="body-lg font-body-semibold text-brand-yellow">Create New Workout</Text>
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
              <Text className="body-md font-body-semibold text-text-primary">My Workouts</Text>
              {customWorkouts.map((workout) => (
                <WorkoutTemplateCard
                  key={workout.id}
                  template={{ key: workout.id, name: workout.name, icon: "construct-outline", exerciseIds: workout.exerciseIds }}
                  onPress={() => handleStartExisting(workout.name, workout.exerciseIds)}
                  onLongPress={() => setOptionsFor(workout)}
                />
              ))}
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
              <Text className="body-sm text-text-secondary">Workout Name</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="e.g. My Push Day"
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
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
              className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-divider py-3.5"
            >
              <Ionicons name="add" size={18} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-text-secondary">Add Exercise</Text>
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
            <Pressable
              onPress={handleSaveAndStart}
              disabled={!canSave}
              className={`items-center rounded-full py-4 ${canSave ? "bg-brand-yellow" : "bg-surface"}`}
            >
              <Text className={`body-lg font-body-semibold ${canSave ? "text-brand-iron" : "text-text-secondary"}`}>
                Save &amp; Start Now
              </Text>
            </Pressable>
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
      />

      <WorkoutOptionsSheet
        visible={optionsFor !== null}
        workoutName={optionsFor?.name ?? ""}
        onClose={() => setOptionsFor(null)}
        onEdit={() => optionsFor && handleEditExisting(optionsFor)}
        onDelete={() => optionsFor && handleDeleteExisting(optionsFor.id, optionsFor.name)}
      />
    </View>
  );
}
