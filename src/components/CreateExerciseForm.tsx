import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { MuscleGroupPicker } from "@/components/MuscleGroupPicker";
import { EXERCISE_EQUIPMENT_OPTIONS, formatMuscleName } from "@/data/exercises";
import type { MuscleGroup } from "@/data/workout-log";
import { colors } from "@/theme";

type CreateExerciseFormProps = {
  onCancel: () => void;
  onCreate: (input: { name: string; primaryMuscle: MuscleGroup; secondaryMuscles: MuscleGroup[]; equipment: string | null }) => void;
};

export function CreateExerciseForm({ onCancel, onCreate }: CreateExerciseFormProps) {
  const [name, setName] = useState("");
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && primaryMuscle !== null;

  function handleTapMuscle(group: MuscleGroup) {
    if (group === primaryMuscle) {
      setPrimaryMuscle(null);
      return;
    }
    if (!primaryMuscle) {
      setPrimaryMuscle(group);
      return;
    }
    setSecondaryMuscles((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  function handleSubmit() {
    if (!canSubmit || !primaryMuscle) return;
    onCreate({ name: name.trim(), primaryMuscle, secondaryMuscles, equipment });
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
      <View className="gap-1.5">
        <Text className="body-sm text-text-secondary">Exercise Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Cable Lateral Raise"
          placeholderTextColor={colors.neutral.textSecondary}
          className="body-md rounded-xl border border-divider bg-surface px-4 py-3 text-text-primary"
        />
      </View>

      <View className="gap-1.5">
        <Text className="body-sm text-text-secondary">Primary &amp; Secondary Muscles</Text>
        <MuscleGroupPicker primaryMuscle={primaryMuscle} secondaryMuscles={secondaryMuscles} onTapMuscle={handleTapMuscle} />
      </View>

      <View className="gap-1.5">
        <Text className="body-sm text-text-secondary">Equipment (optional)</Text>
        <View className="flex-row flex-wrap gap-2">
          {EXERCISE_EQUIPMENT_OPTIONS.map((option) => {
            const selected = equipment === option;
            return (
              <Pressable
                key={option}
                onPress={() => setEquipment(selected ? null : option)}
                className={`rounded-full border px-3 py-1.5 ${
                  selected ? "border-brand-yellow bg-brand-yellow" : "border-divider bg-surface"
                }`}
              >
                <Text className={`caption ${selected ? "text-brand-iron" : "text-text-secondary"}`}>
                  {formatMuscleName(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-2 flex-row gap-3">
        <Pressable onPress={onCancel} className="flex-1 items-center rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 items-center rounded-full py-3.5 ${canSubmit ? "bg-brand-yellow" : "bg-surface"}`}
        >
          <Text className={`body-md font-body-semibold ${canSubmit ? "text-brand-iron" : "text-text-secondary"}`}>
            Add Exercise
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
