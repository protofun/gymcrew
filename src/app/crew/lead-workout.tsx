import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import type { Exercise } from "@/data/exercises";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import { useActiveWorkoutStore } from "@/store/active-workout-store";
import { CURRENT_MEMBER_ID, useCrewStore } from "@/store/crew-store";
import { useLedWorkoutStore } from "@/store/led-workout-store";
import { colors } from "@/theme";

function DraftExerciseRow({ exercise, onRemove }: { exercise: Exercise; onRemove: () => void }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      {exercise.imageUrl ? (
        <Image source={{ uri: exercise.imageUrl }} className="h-12 w-12 rounded-xl bg-background" />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-background">
          <Ionicons name="barbell-outline" size={20} color={colors.neutral.textSecondary} />
        </View>
      )}
      <Text className="body-md font-body-semibold flex-1 text-text-primary">{exercise.name}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={20} color={colors.neutral.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function LeadWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const today = useTodayWorkout();
  const [name, setName] = useState(today.isRestDay ? "" : today.workoutName);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const members = useCrewStore((state) => state.members);
  const me = members.find((member) => member.id === CURRENT_MEMBER_ID);
  const startSession = useLedWorkoutStore((state) => state.startSession);
  const startWorkout = useActiveWorkoutStore((state) => state.startWorkout);
  const setWorkoutName = useActiveWorkoutStore((state) => state.setName);
  const addExercise = useActiveWorkoutStore((state) => state.addExercise);

  const canStart = name.trim().length > 0 && exercises.length > 0;

  function handleStartLeading() {
    if (!canStart || !me) return;
    const trimmedName = name.trim();

    startSession(
      me.id,
      me.name,
      trimmedName,
      exercises.map((exercise) => exercise.id),
    );

    startWorkout();
    setWorkoutName(trimmedName);
    for (const exercise of exercises) addExercise(exercise);
    router.replace("/workout/active");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center border-b border-divider px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Lead a Crew Workout</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="body-sm text-text-secondary">
          Build the exercise list once — everyone who joins sees the same exercises and only fills in their own reps &amp; sets.
        </Text>

        <View className="gap-1.5">
          <Text className="body-sm text-text-secondary">Workout Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Day"
            placeholderTextColor={colors.neutral.textSecondary}
            className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
            style={{ outlineWidth: 0, outlineColor: "transparent" }}
          />
        </View>

        <View className="gap-3">
          {exercises.map((exercise, index) => (
            <DraftExerciseRow
              key={`${exercise.id}-${index}`}
              exercise={exercise}
              onRemove={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
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

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Pressable
          onPress={handleStartLeading}
          disabled={!canStart}
          className={`items-center rounded-full py-4 ${canStart ? "bg-brand-yellow" : "bg-surface"}`}
        >
          <Text className={`body-lg font-body-semibold ${canStart ? "text-brand-iron" : "text-text-secondary"}`}>
            Start Leading
          </Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(exercise) => {
          setExercises((prev) => [...prev, exercise]);
          setPickerVisible(false);
        }}
      />
    </View>
  );
}
