import { BACK_MUSCLES, FRONT_MUSCLES } from "body-muscles";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel, intensityToColor, MUSCLE_GROUP_BY_REGION_ID } from "@/lib/muscle-groups";
import { colors } from "@/theme";

export { formatMuscleLabel, intensityToColor };

const FRONT_VIEW_BOX = "0 0 35 93";
const BACK_VIEW_BOX = "37 0 35 93";
const BODY_ASPECT_RATIO = 35 / 93;

function intensityForMuscleId(id: string, muscleIntensity: Partial<Record<MuscleGroup, number>>): number {
  const group = MUSCLE_GROUP_BY_REGION_ID.get(id);
  return (group ? muscleIntensity[group] : undefined) ?? 0;
}

function BodyView({
  label,
  muscles,
  viewBox,
  width,
  height,
  muscleIntensity,
}: {
  label: string;
  muscles: { id: string; path: string }[];
  viewBox: string;
  width: number;
  height: number;
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
}) {
  return (
    <View className="items-center gap-1.5">
      <Svg width={width} height={height} viewBox={viewBox}>
        {muscles.map((muscle) => {
          const intensity = intensityForMuscleId(muscle.id, muscleIntensity);
          return (
            <Path
              key={muscle.id}
              d={muscle.path}
              fill={intensity ? intensityToColor(intensity) : colors.neutral.divider}
              stroke={colors.neutral.background}
              strokeWidth={0.15}
            />
          );
        })}
      </Svg>
      <Text className="body-sm font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

type MuscleHeatmapProps = {
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
  height?: number;
  showLegend?: boolean;
};

export function MuscleHeatmap({ muscleIntensity, height = 210, showLegend = true }: MuscleHeatmapProps) {
  const width = Math.round(height * BODY_ASPECT_RATIO);
  const trainedGroups = (Object.entries(muscleIntensity) as [MuscleGroup, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <View className="gap-4">
      <View className="flex-row items-start justify-center gap-6">
        <BodyView
          label="Front"
          muscles={FRONT_MUSCLES}
          viewBox={FRONT_VIEW_BOX}
          width={width}
          height={height}
          muscleIntensity={muscleIntensity}
        />
        <BodyView
          label="Back"
          muscles={BACK_MUSCLES}
          viewBox={BACK_VIEW_BOX}
          width={width}
          height={height}
          muscleIntensity={muscleIntensity}
        />
      </View>

      {showLegend && (
        <View className="flex-row flex-wrap justify-center gap-2">
          {trainedGroups.map(([group, intensity]) => (
            <View
              key={group}
              className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
              style={{ backgroundColor: intensityToColor(intensity) }}
            >
              <Text className="caption font-body-semibold text-brand-iron">
                {formatMuscleLabel(group)} {intensity}/10
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
