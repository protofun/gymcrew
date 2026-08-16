import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { formatMuscleLabel, intensityToColor, MuscleHeatmap } from "@/components/MuscleHeatmap";
import type { MuscleGroup, WorkoutSession } from "@/data/workout-log";
import { useCountUp } from "@/hooks/use-count-up";
import { toDateKey } from "@/lib/date";
import { useWorkoutNotesStore } from "@/store/workout-notes-store";
import { colors } from "@/theme";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function Divider() {
  return <View className="h-px bg-divider" />;
}

function StatValue({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const animatedValue = useCountUp(value);
  return (
    <View className="gap-1">
      <Text className="caption text-text-secondary">{label}</Text>
      <Text className="body-lg font-body-semibold text-text-primary">
        {animatedValue.toLocaleString("en-US")}
        {suffix}
      </Text>
    </View>
  );
}

type WorkoutSummaryModalProps = {
  visible: boolean;
  onClose: () => void;
  date: Date | null;
  session: WorkoutSession | null;
};

export function WorkoutSummaryModal({ visible, onClose, date, session }: WorkoutSummaryModalProps) {
  const dateKey = date ? toDateKey(date) : null;
  const savedNote = useWorkoutNotesStore((state) => (dateKey ? (state.notesByDate[dateKey] ?? "") : ""));
  const setNote = useWorkoutNotesStore((state) => state.setNote);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(savedNote);

  useEffect(() => {
    setNoteDraft(savedNote);
    setIsEditingNote(false);
  }, [dateKey, savedNote]);

  if (!date || !session || !dateKey) return null;

  const trainedGroups = (Object.entries(session.muscleIntensity) as [MuscleGroup, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  const saveNote = () => {
    setNote(dateKey, noteDraft.trim());
    setIsEditingNote(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
        >
          <Pressable onPress={onClose} hitSlop={12} className="absolute right-4 top-4 z-10">
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>

          <View className="gap-1 pr-6">
            <Text className="heading-4 text-text-primary">
              {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </Text>
            <Text className="body-lg font-body-semibold text-brand-yellow">{session.name}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success} />
              <Text className="body-md font-body-semibold text-brand-yellow">Workout Completed</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={16} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-secondary">{formatDuration(session.durationMin)}</Text>
            </View>
          </View>

          <Divider />

          <View className="gap-3">
            <Text className="body-md font-body-semibold text-text-primary">Muscles Trained</Text>
            <View className="flex-row items-center gap-4">
              <MuscleHeatmap muscleIntensity={session.muscleIntensity} height={170} showLegend={false} />
              <View className="flex-1 gap-3">
                {trainedGroups.map(([group, intensity]) => (
                  <View key={group} className="flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: intensityToColor(intensity) }} />
                    <Text className="body-md text-text-primary">{formatMuscleLabel(group)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <Divider />

          <View className="flex-row justify-between">
            <StatValue label="Volume" value={session.volumeKg} suffix=" kg" />
            <StatValue label="Exercises" value={session.exercises} />
            <StatValue label="Calories" value={session.calories} suffix=" kcal" />
          </View>

          <Divider />

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="body-md font-body-semibold text-text-primary">Notes</Text>
              <Pressable onPress={isEditingNote ? saveNote : () => setIsEditingNote(true)} hitSlop={8}>
                <Ionicons
                  name={isEditingNote ? "checkmark-outline" : "pencil-outline"}
                  size={18}
                  color={colors.neutral.textSecondary}
                />
              </Pressable>
            </View>

            {isEditingNote ? (
              <TextInput
                value={noteDraft}
                onChangeText={setNoteDraft}
                onBlur={saveNote}
                multiline
                autoFocus
                placeholder="Add notes about this workout..."
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl bg-background p-3 text-text-primary"
                style={{ minHeight: 64, textAlignVertical: "top" }}
              />
            ) : (
              <Text className="body-md text-text-secondary">{savedNote || "No notes yet. Tap the pencil to add some."}</Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
