import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreateExerciseForm } from "@/components/CreateExerciseForm";
import { type Exercise, formatMuscleName, searchExercises } from "@/data/exercises";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { colors } from "@/theme";

type ExercisePickerModalProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
};

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-divider px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {exercise.imageUrl ? (
        <Image source={{ uri: exercise.imageUrl }} className="h-11 w-11 rounded-xl bg-surface" />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-surface">
          <Ionicons name="barbell-outline" size={18} color={colors.neutral.textSecondary} />
        </View>
      )}
      <View className="flex-1 gap-0.5">
        <Text className="body-md font-body-semibold text-text-primary" numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text className="caption text-text-secondary" numberOfLines={1}>
          {formatMuscleName(exercise.primaryMuscles[0] ?? "")}
          {exercise.equipment ? ` • ${formatMuscleName(exercise.equipment)}` : ""}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color={colors.brand.yellow} />
    </Pressable>
  );
}

function CreateExerciseRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-divider px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl border border-dashed border-divider">
        <Ionicons name="add" size={20} color={colors.brand.yellow} />
      </View>
      <Text className="body-md font-body-semibold text-brand-yellow">Can&apos;t find it? Create your own exercise</Text>
    </Pressable>
  );
}

export function ExercisePickerModal({ visible, title = "Add Exercise", onClose, onSelect }: ExercisePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");

  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const addCustomExercise = useCustomExercisesStore((state) => state.addExercise);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matchingCustom = trimmed
      ? customExercises.filter(
          (exercise) =>
            exercise.name.toLowerCase().includes(trimmed) ||
            exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(trimmed)),
        )
      : customExercises;
    // No cap — the library is ~870 exercises and FlatList virtualizes rendering, so showing
    // everything (rather than an arbitrary slice) is cheap and lets people actually browse it all.
    return [...matchingCustom, ...searchExercises(query)];
  }, [query, customExercises]);

  function reset() {
    setQuery("");
    setMode("search");
  }

  function handleSelect(exercise: Exercise) {
    onSelect(exercise);
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCreate(input: Parameters<typeof addCustomExercise>[0]) {
    const exercise = addCustomExercise(input);
    handleSelect(exercise);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.neutral.background }}>
        <View className="flex-row items-center justify-between border-b border-divider px-4 pb-3 pt-2">
          <Text className="heading-4 text-text-primary">{mode === "search" ? title : "Create Exercise"}</Text>
          <Pressable onPress={mode === "search" ? handleClose : () => setMode("search")} hitSlop={8}>
            <Ionicons name={mode === "search" ? "close" : "arrow-back"} size={24} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        {mode === "create" ? (
          <CreateExerciseForm onCancel={() => setMode("search")} onCreate={handleCreate} />
        ) : (
          <>
            <View className="flex-row items-center gap-2 border-b border-divider px-4 py-3">
              <Ionicons name="search" size={18} color={colors.neutral.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises or muscles..."
                placeholderTextColor={colors.neutral.textSecondary}
                autoCorrect={false}
                className="body-md flex-1 text-text-primary"
              />
            </View>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => handleSelect(item)} />}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={<CreateExerciseRow onPress={() => setMode("create")} />}
              ListEmptyComponent={
                <Text className="body-md py-10 text-center text-text-secondary">No exercises found.</Text>
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
}
