import { Text, View } from "react-native";

import type { LoggedExercise } from "@/store/active-workout-store";

function exerciseVolume(exercise: LoggedExercise): number {
  return exercise.sets
    .filter((set) => set.completed)
    .reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
}

type ExerciseVolumeChartProps = {
  exercises: LoggedExercise[];
  unit: string;
};

export function ExerciseVolumeChart({ exercises, unit }: ExerciseVolumeChartProps) {
  const rows = exercises
    .map((exercise) => ({ name: exercise.name, volume: exerciseVolume(exercise) }))
    .filter((row) => row.volume > 0)
    .sort((a, b) => b.volume - a.volume);

  if (rows.length === 0) return null;

  const maxVolume = Math.max(...rows.map((row) => row.volume));

  return (
    <View className="gap-3">
      <Text className="body-md font-body-semibold text-text-primary">Volume by Exercise</Text>
      <View className="gap-3">
        {rows.map((row) => (
          <View key={row.name} className="gap-1">
            <View className="flex-row items-baseline justify-between">
              <Text className="body-sm text-text-primary" numberOfLines={1}>
                {row.name}
              </Text>
              <Text className="caption text-text-secondary">
                {row.volume.toLocaleString("en-US")} {unit}
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-background">
              <View
                className="h-2 rounded-full bg-brand-yellow"
                style={{ width: `${Math.max(4, (row.volume / maxVolume) * 100)}%` }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
