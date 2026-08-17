import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import { ExerciseActionsSheet } from "@/components/ExerciseActionsSheet";
import { ExerciseSetRow } from "@/components/ExerciseSetRow";
import { formatMuscleName } from "@/data/exercises";
import { getLastPerformance } from "@/lib/exercise-history";
import type { LoggedExercise, LoggedSet, WeightUnit } from "@/store/active-workout-store";
import { useWorkoutHistoryStore } from "@/store/workout-history-store";
import { colors } from "@/theme";

type WorkoutLoggerProps = {
  exercise: LoggedExercise;
  unit: WeightUnit;
  expanded: boolean;
  onToggleExpand: () => void;
  onRemoveExercise: () => void;
  onReplaceExercise: () => void;
  onSetNote: (note: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, updates: Partial<Omit<LoggedSet, "id">>) => void;
};

export function WorkoutLogger({
  exercise,
  unit,
  expanded,
  onToggleExpand,
  onRemoveExercise,
  onReplaceExercise,
  onSetNote,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
}: WorkoutLoggerProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(exercise.note);

  useEffect(() => {
    setNoteDraft(exercise.note);
  }, [exercise.note]);

  function saveNote() {
    onSetNote(noteDraft.trim());
    setEditingNote(false);
  }

  const completedCount = exercise.sets.filter((set) => set.completed).length;
  const allDone = exercise.sets.length > 0 && completedCount === exercise.sets.length;

  const pastWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const lastPerformance = getLastPerformance(pastWorkouts, exercise.exerciseId);

  return (
    <View className="flex-row overflow-hidden rounded-2xl border border-divider bg-surface">
      {/* Green only marks the exercise you're currently working on (expanded), not completion —
          with several exercises added at once, color now answers "which one am I logging?" */}
      <View className={expanded ? "w-1.5 bg-success" : "w-1.5 bg-transparent"} />

      <View className="flex-1 gap-4 p-5">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={onToggleExpand} className="flex-1 flex-row items-center gap-3">
            {exercise.imageUrl ? (
              <Image source={{ uri: exercise.imageUrl }} className="h-16 w-16 rounded-2xl bg-background" />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-background">
                <Ionicons name="barbell-outline" size={26} color={colors.neutral.textSecondary} />
              </View>
            )}

            <View className="flex-1 gap-1">
              <Text className="body-lg font-body-semibold text-text-primary">{exercise.name}</Text>
              <View className="flex-row items-center gap-2">
                {!!exercise.primaryMuscle && (
                  <View className="rounded-full bg-brand-yellow/15 px-2.5 py-1">
                    <Text className="caption font-body-semibold text-brand-yellow">
                      {formatMuscleName(exercise.primaryMuscle)}
                    </Text>
                  </View>
                )}
                <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${allDone ? "bg-success/20" : "bg-background"}`}>
                  {allDone && <Ionicons name="checkmark-circle" size={12} color={colors.semantic.success} />}
                  <Text className={`caption font-body-semibold ${allDone ? "text-success" : "text-text-secondary"}`}>
                    {completedCount}/{exercise.sets.length} sets
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable onPress={() => setMenuVisible(true)} hitSlop={10} className="p-1">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <Pressable onPress={onToggleExpand} hitSlop={10} className="p-1">
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        {expanded && (
          <>
            {editingNote ? (
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                onBlur={saveNote}
                multiline
                autoFocus
                placeholder="Add a note for this exercise..."
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-sm rounded-xl bg-background px-3 py-2.5 text-text-primary"
              />
            ) : (
              !!exercise.note && (
                <Pressable onPress={() => setEditingNote(true)}>
                  <Text className="body-sm italic text-text-secondary">{exercise.note}</Text>
                </Pressable>
              )
            )}

            <View className="flex-row items-center gap-3 px-2.5">
              <View className="w-8" />
              <View className="flex-1 flex-row items-center justify-center gap-1">
                <Ionicons name="barbell-outline" size={12} color={colors.neutral.textSecondary} />
                <Text className="caption text-text-secondary">{unit.toUpperCase()}</Text>
              </View>
              <View className="flex-1 flex-row items-center justify-center gap-1">
                <Ionicons name="repeat-outline" size={12} color={colors.neutral.textSecondary} />
                <Text className="caption text-text-secondary">REPS</Text>
              </View>
              <View className="w-9 items-center">
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.neutral.textSecondary} />
              </View>
            </View>

            <View className="gap-2.5">
              {exercise.sets.map((set, index) => (
                <ExerciseSetRow
                  key={set.id}
                  index={index + 1}
                  set={set}
                  unit={unit}
                  previousSet={lastPerformance?.[index] ?? null}
                  onUpdate={(updates) => onUpdateSet(set.id, updates)}
                  onRemove={() => onRemoveSet(set.id)}
                />
              ))}
            </View>

            <Pressable
              onPress={onAddSet}
              className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-divider py-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="add" size={16} color={colors.neutral.textSecondary} />
              <Text className="body-sm text-text-secondary">Add Set</Text>
            </Pressable>
          </>
        )}
      </View>

      <ExerciseActionsSheet
        visible={menuVisible}
        exerciseName={exercise.name}
        hasNote={!!exercise.note}
        onClose={() => setMenuVisible(false)}
        onReplace={() => {
          setMenuVisible(false);
          onReplaceExercise();
        }}
        onEditNote={() => {
          setMenuVisible(false);
          // Deferred: opening the note TextInput (autoFocus) in the same tick as the sheet's Modal
          // unmounting races the two focus changes on web — the sheet's dismissal steals focus back
          // right after the TextInput grabs it, which fires onBlur and immediately closes the editor.
          setTimeout(() => setEditingNote(true), 300);
        }}
        onRemove={() => {
          setMenuVisible(false);
          onRemoveExercise();
        }}
      />
    </View>
  );
}
