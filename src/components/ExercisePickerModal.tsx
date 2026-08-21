import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CreateExerciseForm } from "@/components/CreateExerciseForm";
import { ExerciseInstructionsModal } from "@/components/ExerciseInstructionsModal";
import { type Exercise, formatMuscleName, searchExercises } from "@/data/exercises";
import { useCustomExercisesStore } from "@/store/custom-exercises-store";
import { useFavoriteExercisesStore } from "@/store/favorite-exercises-store";
import { colors } from "@/theme";

type ExercisePickerModalProps = {
  visible: boolean;
  title?: string;
  /** Shown under the header, e.g. explaining what selecting an exercise here does. */
  subtitle?: string;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  /** An optional leading badge per row (e.g. a rank medal) — replaces the default photo/icon when given. */
  renderLeading?: (exercise: Exercise) => ReactNode;
  /** Hides the "create your own exercise" row — irrelevant outside the workout builder. */
  hideCreateRow?: boolean;
};

function ExerciseRow({
  exercise,
  isFavorite,
  onPress,
  onInfoPress,
  onToggleFavorite,
  renderLeading,
}: {
  exercise: Exercise;
  isFavorite: boolean;
  onPress: () => void;
  onInfoPress: () => void;
  onToggleFavorite: () => void;
  renderLeading?: (exercise: Exercise) => ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-divider px-4 py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {renderLeading ? (
        renderLeading(exercise)
      ) : exercise.imageUrl ? (
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
      <Pressable onPress={onToggleFavorite} hitSlop={8} className="p-1">
        <Ionicons name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? colors.brand.yellow : colors.neutral.textSecondary} />
      </Pressable>
      <Pressable onPress={onInfoPress} hitSlop={8} className="p-1">
        <Ionicons name="information-circle-outline" size={22} color={colors.neutral.textSecondary} />
      </Pressable>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral.textSecondary} />
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

export function ExercisePickerModal({
  visible,
  title = "Add Exercise",
  subtitle,
  onClose,
  onSelect,
  renderLeading,
  hideCreateRow = false,
}: ExercisePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

  const customExercises = useCustomExercisesStore((state) => state.exercises);
  const addCustomExercise = useCustomExercisesStore((state) => state.addExercise);
  const favoriteIds = useFavoriteExercisesStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoriteExercisesStore((state) => state.toggleFavorite);

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
    const all = [...matchingCustom, ...searchExercises(query)];
    return favoritesOnly ? all.filter((exercise) => favoriteIds.includes(exercise.id)) : all;
  }, [query, customExercises, favoritesOnly, favoriteIds]);

  function reset() {
    setQuery("");
    setMode("search");
    setFavoritesOnly(false);
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
        <View className="border-b border-divider px-4 pb-3 pt-2">
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">{mode === "search" ? title : "Create Exercise"}</Text>
            <Pressable onPress={mode === "search" ? handleClose : () => setMode("search")} hitSlop={8}>
              <Ionicons name={mode === "search" ? "close" : "arrow-back"} size={24} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>
          {mode === "search" && subtitle && <Text className="caption mt-1 text-text-secondary">{subtitle}</Text>}
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
              <Pressable
                onPress={() => setFavoritesOnly((current) => !current)}
                hitSlop={8}
                className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${favoritesOnly ? "bg-brand-yellow" : "border border-divider"}`}
              >
                <Ionicons name={favoritesOnly ? "star" : "star-outline"} size={13} color={favoritesOnly ? colors.brand.iron : colors.neutral.textSecondary} />
                <Text className={`caption font-body-semibold ${favoritesOnly ? "text-brand-iron" : "text-text-secondary"}`}>Favorites</Text>
              </Pressable>
            </View>

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ExerciseRow
                  exercise={item}
                  isFavorite={favoriteIds.includes(item.id)}
                  onPress={() => handleSelect(item)}
                  onInfoPress={() => setInfoExercise(item)}
                  onToggleFavorite={() => toggleFavorite(item.id)}
                  renderLeading={renderLeading}
                />
              )}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={hideCreateRow ? undefined : <CreateExerciseRow onPress={() => setMode("create")} />}
              ListEmptyComponent={
                <Text className="body-md py-10 text-center text-text-secondary">
                  {favoritesOnly ? "No favorites yet — tap the star on an exercise to save it." : "No exercises found."}
                </Text>
              }
            />
          </>
        )}
      </View>

      <ExerciseInstructionsModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </Modal>
  );
}
