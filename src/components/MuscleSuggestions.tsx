import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { formatMuscleLabel, MuscleHeatmap } from "@/components/MuscleHeatmap";
import type { MuscleGroup, WorkoutSession } from "@/data/workout-log";
import { getMuscleSuggestions, type SuggestionPriority } from "@/lib/muscle-suggestions";
import { colors } from "@/theme";

// Medium priority is a muted version of the brand yellow-green — same hue,
// lower brightness — so "needs a little work" reads calmer than "neglected."
const PRIORITY_COLOR: Record<SuggestionPriority, string> = {
  High: colors.brand.yellow,
  Medium: "rgb(187, 206, 71)",
};

// Feeds the ranked suggestions back into MuscleHeatmap's 1-10 intensity
// scale so the same body-highlight visual can be reused here.
const PRIORITY_HEATMAP_INTENSITY: Record<SuggestionPriority, number> = {
  High: 9,
  Medium: 5,
};

type MuscleSuggestionsProps = {
  sessions: Record<string, WorkoutSession>;
};

export function MuscleSuggestions({ sessions }: MuscleSuggestionsProps) {
  const suggestions = useMemo(() => getMuscleSuggestions(sessions, new Date()), [sessions]);

  const heatmapIntensity = useMemo(() => {
    const intensity: Partial<Record<MuscleGroup, number>> = {};
    for (const suggestion of suggestions) {
      intensity[suggestion.group] = PRIORITY_HEATMAP_INTENSITY[suggestion.priority];
    }
    return intensity;
  }, [suggestions]);

  return (
    <View className="mx-4 mt-8 gap-4">
      <View>
        <Text className="heading-4 text-text-primary">Muscle Suggestions</Text>
        <Text className="caption text-text-secondary">Based on your training this week</Text>
      </View>

      <View className="flex-row items-center gap-4 rounded-3xl border border-divider bg-surface p-4">
        <View className="flex-1 gap-4">
          {suggestions.map((suggestion, index) => (
            <View
              key={suggestion.group}
              className={`flex-row items-center gap-3 ${
                index < suggestions.length - 1 ? "border-b border-divider pb-4" : ""
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-background">
                <Ionicons name="alert-circle-outline" size={18} color={PRIORITY_COLOR[suggestion.priority]} />
              </View>
              <View>
                <Text className="body-md font-body-semibold text-text-primary">
                  {formatMuscleLabel(suggestion.group)}
                </Text>
                <Text className="caption font-body-semibold" style={{ color: PRIORITY_COLOR[suggestion.priority] }}>
                  {suggestion.priority} Priority
                </Text>
              </View>
            </View>
          ))}
        </View>

        <MuscleHeatmap muscleIntensity={heatmapIntensity} height={190} showLegend={false} />
      </View>
    </View>
  );
}
