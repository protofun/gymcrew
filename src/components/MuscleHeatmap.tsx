import { BACK_MUSCLES, FRONT_MUSCLES } from "body-muscles";
import { Image, Text, View, type ImageSourcePropType } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel, intensityToColor, MUSCLE_GROUP_BY_REGION_ID } from "@/lib/muscle-groups";
import { colors } from "@/theme";

export { formatMuscleLabel, intensityToColor };

const FRONT_VIEW_BOX = "0 0 35 93";
const BACK_VIEW_BOX = "37 0 35 93";
const BODY_ASPECT_RATIO = 35 / 93;

// `undefined` (no entry — muscle group has no data at all) is distinct from a real `0` value (e.g.
// rank tier index 0, "rookie" — still a meaningful rank, not "untrained"), so this can't collapse
// to a plain `?? 0` the way a training-load scale could.
function intensityForMuscleId(id: string, muscleIntensity: Partial<Record<MuscleGroup, number>>): number | undefined {
  const group = MUSCLE_GROUP_BY_REGION_ID.get(id);
  return group ? muscleIntensity[group] : undefined;
}

function BodyView({
  label,
  muscles,
  viewBox,
  width,
  height,
  muscleIntensity,
  colorForIntensity,
}: {
  label: string;
  muscles: { id: string; path: string }[];
  viewBox: string;
  width: number;
  height: number;
  muscleIntensity: Partial<Record<MuscleGroup, number>>;
  colorForIntensity: (intensity: number) => string;
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
              fill={intensity !== undefined ? colorForIntensity(intensity) : colors.neutral.divider}
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
  /** Defaults to the single-person yellow scale — pass intensityToRedGreenColor for a crew-comparative view. */
  colorForIntensity?: (intensity: number) => string;
  /** Overrides the legend chip's text (default: "{Muscle} {value}/10") — e.g. a rank name when
   * `muscleIntensity` values represent rank tiers rather than training load. */
  legendLabel?: (group: MuscleGroup, value: number) => string;
  /** An optional small icon shown before the legend chip's text (e.g. a rank badge). */
  legendIcon?: (group: MuscleGroup, value: number) => ImageSourcePropType | undefined;
};

export function MuscleHeatmap({
  muscleIntensity,
  height = 210,
  showLegend = true,
  colorForIntensity = intensityToColor,
  legendLabel,
  legendIcon,
}: MuscleHeatmapProps) {
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
          colorForIntensity={colorForIntensity}
        />
        <BodyView
          label="Back"
          muscles={BACK_MUSCLES}
          viewBox={BACK_VIEW_BOX}
          width={width}
          height={height}
          muscleIntensity={muscleIntensity}
          colorForIntensity={colorForIntensity}
        />
      </View>

      {showLegend && (
        <View className="flex-row flex-wrap justify-center gap-2">
          {trainedGroups.map(([group, value]) => {
            const icon = legendIcon?.(group, value);
            return (
              <View
                key={group}
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ backgroundColor: colorForIntensity(value) }}
              >
                {icon && <Image source={icon} resizeMode="contain" style={{ width: 14, height: 14 }} />}
                <Text className="caption font-body-semibold text-brand-iron">
                  {legendLabel ? legendLabel(group, value) : `${formatMuscleLabel(group)} ${value}/10`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
