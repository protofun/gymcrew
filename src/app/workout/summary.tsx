import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { ExerciseVolumeChart } from "@/components/ExerciseVolumeChart";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { VolumeTrendChart } from "@/components/VolumeTrendChart";
import { formatMuscleName } from "@/data/exercises";
import { formatElapsed } from "@/hooks/use-elapsed-timer";
import type { LoggedExercise } from "@/store/active-workout-store";
import { useWorkoutHistoryStore, type CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

type Tab = "overview" | "exercises" | "muscles";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "exercises", label: "Exercises" },
  { key: "muscles", label: "Muscles" },
];

function ratingFor(workout: CompletedWorkout): { emoji: string; label: string; detail: string } {
  const prCount = workout.prs.length;
  if (prCount > 0) {
    return { emoji: "🔥", label: "Monster Session!", detail: `Great intensity and ${prCount} new PR${prCount > 1 ? "s" : ""}.` };
  }
  if (workout.completedSets >= 15) return { emoji: "💪", label: "Strong Session", detail: "Solid volume today." };
  if (workout.completedSets > 0) return { emoji: "✅", label: "Workout Logged", detail: "Nice work getting it done." };
  return { emoji: "📝", label: "Session Recorded", detail: "No sets were marked complete." };
}

function StatItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1.5">
      <Ionicons name={icon} size={18} color={colors.brand.yellow} />
      <Text className="heading-4 text-text-primary">{value}</Text>
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

function VDivider() {
  return <View className="h-10 w-px bg-divider" />;
}

function ExerciseAccordionRow({ exercise, unit, hasPr }: { exercise: LoggedExercise; unit: string; hasPr: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const completedSets = exercise.sets.filter((set) => set.completed);

  return (
    <View>
      <Pressable onPress={() => setExpanded((value) => !value)} className="flex-row items-center gap-3 py-4">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="barbell-outline" size={18} color={colors.neutral.textSecondary} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="body-lg font-body-semibold text-text-primary">{exercise.name}</Text>
            {hasPr && <Ionicons name="trophy" size={14} color={colors.brand.yellow} />}
          </View>
          <Text className="caption text-text-secondary">
            {completedSets.length} of {exercise.sets.length} sets · {formatMuscleName(exercise.primaryMuscle)}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.neutral.textSecondary} />
      </Pressable>

      {expanded && (
        <View className="gap-2 pb-4 pl-[52px]">
          <View className="flex-row items-center gap-2 px-1">
            <Text className="caption w-8 text-text-secondary">SET</Text>
            <Text className="caption flex-1 text-center text-text-secondary">{unit.toUpperCase()}</Text>
            <Text className="caption flex-1 text-center text-text-secondary">REPS</Text>
            <Text className="caption w-8 text-center text-text-secondary">✓</Text>
          </View>
          {exercise.sets.map((set, index) => (
            <View
              key={set.id}
              className={`flex-row items-center gap-2 rounded-lg px-1 py-2 ${set.completed ? "bg-success/20" : ""}`}
            >
              <Text className="body-sm w-8 text-text-secondary">{index + 1}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.weightKg ?? "—"}</Text>
              <Text className="body-sm flex-1 text-center text-text-primary">{set.reps ?? "—"}</Text>
              <View className="w-8 items-center">
                <Ionicons
                  name={set.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={set.completed ? colors.semantic.success : colors.neutral.textSecondary}
                />
              </View>
            </View>
          ))}
          {!!exercise.note && <Text className="body-sm mt-1 italic text-text-secondary">{exercise.note}</Text>}
        </View>
      )}
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const posthog = usePostHog();

  const allWorkouts = useWorkoutHistoryStore((state) => state.workouts);
  const workout = allWorkouts.find((w) => w.id === id) ?? allWorkouts[0];
  const updateWorkoutNotes = useWorkoutHistoryStore((state) => state.updateWorkoutNotes);

  if (!workout) {
    router.replace("/home");
    return null;
  }

  const rating = ratingFor(workout);
  const prExerciseIds = new Set(workout.prs.map((pr) => pr.exerciseId));

  function handleShare() {
    // Share.share returns a rejected promise on web when the browser has no native share sheet
    // (e.g. non-HTTPS or headless contexts) — .catch() it so that never surfaces as an unhandled
    // rejection (a plain try/catch around the call wouldn't catch an async rejection like this).
    posthog.capture("workout_shared", {
      workout_name: workout!.name,
      volume_kg: workout!.volumeKg,
      completed_sets: workout!.completedSets,
      duration_seconds: workout!.durationSeconds,
    });
    Share.share({
      message: `${workout!.name} — ${formatElapsed(workout!.durationSeconds)}, ${workout!.volumeKg.toLocaleString(
        "en-US",
      )} ${workout!.unit} lifted across ${workout!.completedSets} sets on GymCrew.`,
    }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="flex-row items-center justify-between px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
        <Text className="heading-4 text-text-primary">Workout Summary</Text>
        <Pressable onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.neutral.textPrimary} />
        </Pressable>
      </View>

      <View className="gap-1 px-4 pb-4">
        <Text className="body-lg font-body-semibold text-text-primary">{workout.name}</Text>
        <Text className="caption text-text-secondary">
          {new Date(workout.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} ·{" "}
          {formatElapsed(workout.durationSeconds)}
        </Text>
      </View>

      <View className="flex-row gap-6 border-b border-divider px-4">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} className="items-center gap-2 py-3">
              <Text className={`body-md font-body-semibold ${active ? "text-brand-yellow" : "text-text-secondary"}`}>
                {t.label}
              </Text>
              <View className={`h-0.5 w-full rounded-full ${active ? "bg-brand-yellow" : "bg-transparent"}`} />
            </Pressable>
          );
        })}
      </View>

      {/* contentContainerStyle is all-inline here, not contentContainerClassName — mixing the two
          is unreliable on native with this project's NativeWind preview version (same class of bug
          as the TextInput textAlign crash: works on web, silently drops or conflicts on native). */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 32, paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "overview" && (
          <>
            <View className="flex-row items-center justify-between">
              <StatItem icon="time-outline" label="Duration" value={formatElapsed(workout.durationSeconds)} />
              <VDivider />
              <StatItem icon="barbell-outline" label="Volume" value={`${workout.volumeKg.toLocaleString("en-US")} ${workout.unit}`} />
              <VDivider />
              <StatItem icon="layers-outline" label="Sets" value={String(workout.completedSets)} />
              <VDivider />
              <StatItem icon="trophy-outline" label="PRs" value={String(workout.prs.length)} />
            </View>

            <View className="flex-row items-center gap-3">
              <Text style={{ fontSize: 28 }}>{rating.emoji}</Text>
              <View className="flex-1 gap-0.5">
                <Text className="body-md font-body-semibold text-text-primary">{rating.label}</Text>
                <Text className="body-sm text-text-secondary">{rating.detail}</Text>
              </View>
            </View>

            <VolumeTrendChart workouts={allWorkouts} currentWorkoutId={workout.id} />

            <ExerciseVolumeChart exercises={workout.exercises} unit={workout.unit} />

            <View className="gap-2">
              <Text className="body-sm text-text-secondary">Notes</Text>
              <TextInput
                value={workout.notes}
                onChangeText={(text) => updateWorkoutNotes(workout!.id, text)}
                placeholder="How did this workout feel?"
                placeholderTextColor={colors.neutral.textSecondary}
                multiline
                className="body-md rounded-xl bg-surface px-4 py-3 text-text-primary"
                style={{ minHeight: 90, textAlignVertical: "top" }}
              />
            </View>
          </>
        )}

        {tab === "exercises" &&
          (workout.exercises.length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No exercises logged.</Text>
          ) : (
            <View className="-mt-4">
              {workout.exercises.map((exercise, index) => (
                <View key={exercise.exerciseId}>
                  {index > 0 && <View className="h-px bg-divider" />}
                  <ExerciseAccordionRow exercise={exercise} unit={workout.unit} hasPr={prExerciseIds.has(exercise.exerciseId)} />
                </View>
              ))}
            </View>
          ))}

        {tab === "muscles" &&
          (Object.keys(workout.muscleIntensity).length === 0 ? (
            <Text className="body-md py-10 text-center text-text-secondary">No muscle data for this workout.</Text>
          ) : (
            <View className="items-center gap-4">
              <MuscleHeatmap muscleIntensity={workout.muscleIntensity} height={300} />
            </View>
          ))}
      </ScrollView>
    </View>
  );
}
