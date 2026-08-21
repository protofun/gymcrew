import { BACK_MUSCLES, FRONT_MUSCLES } from "body-muscles";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MuscleGroup } from "@/data/workout-log";
import { formatMuscleLabel, MUSCLE_GROUP_BY_REGION_ID } from "@/lib/muscle-groups";
import { colors } from "@/theme";

const FRONT_VIEW_BOX = "0 0 35 93";
const BACK_VIEW_BOX = "37 0 35 93";
const BODY_ASPECT_RATIO = 35 / 93;

function colorForGroup(group: MuscleGroup | undefined, primaryMuscle: MuscleGroup | null, secondaryMuscles: MuscleGroup[]) {
  if (!group) return colors.neutral.divider;
  if (group === primaryMuscle) return colors.brand.yellow;
  if (secondaryMuscles.includes(group)) return colors.brand.green;
  return colors.neutral.divider;
}

function BodyView({
  label,
  muscles,
  viewBox,
  width,
  height,
  primaryMuscle,
  secondaryMuscles,
  onTapMuscle,
}: {
  label: string;
  muscles: { id: string; path: string }[];
  viewBox: string;
  width: number;
  height: number;
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  onTapMuscle?: (group: MuscleGroup) => void;
}) {
  return (
    <View className="items-center gap-1.5">
      <Svg width={width} height={height} viewBox={viewBox}>
        {muscles.map((muscle) => {
          const group = MUSCLE_GROUP_BY_REGION_ID.get(muscle.id);
          return (
            <Path
              key={muscle.id}
              d={muscle.path}
              fill={colorForGroup(group, primaryMuscle, secondaryMuscles)}
              stroke={colors.neutral.background}
              strokeWidth={0.15}
              onPress={group && onTapMuscle ? () => onTapMuscle(group) : undefined}
            />
          );
        })}
      </Svg>
      <Text className="body-sm font-body-semibold text-text-secondary">{label}</Text>
    </View>
  );
}

type MuscleGroupPickerProps = {
  primaryMuscle: MuscleGroup | null;
  secondaryMuscles: MuscleGroup[];
  /** Omit for a read-only diagram (e.g. showing an exercise's muscles rather than picking them). */
  onTapMuscle?: (group: MuscleGroup) => void;
  height?: number;
};

/**
 * Body diagram highlighting primary (yellow) vs secondary (green) muscles. When `onTapMuscle` is
 * given it's also an editable picker for a custom exercise's muscles — tapping a region sets it as
 * primary if none is set yet, tapping again toggles it between secondary and unselected, and the
 * parent owns the selection logic (see `handleTapMuscle` in CreateExerciseForm). Without
 * `onTapMuscle` it's a plain read-only highlight (e.g. ExerciseInstructionsModal).
 */
export function MuscleGroupPicker({ primaryMuscle, secondaryMuscles, onTapMuscle, height = 340 }: MuscleGroupPickerProps) {
  const width = Math.round(height * BODY_ASPECT_RATIO);

  return (
    <View className="gap-3">
      <Text className="body-sm text-text-secondary">
        {onTapMuscle
          ? primaryMuscle
            ? "Tap more muscles to add as secondary, or tap the primary again to clear it."
            : "Tap a muscle on the body to set it as primary."
          : "Primary muscle in yellow, secondary muscles in green."}
      </Text>

      <View className="flex-row items-start justify-center gap-8 rounded-2xl border border-divider bg-surface py-4">
        <BodyView
          label="Front"
          muscles={FRONT_MUSCLES}
          viewBox={FRONT_VIEW_BOX}
          width={width}
          height={height}
          primaryMuscle={primaryMuscle}
          secondaryMuscles={secondaryMuscles}
          onTapMuscle={onTapMuscle}
        />
        <BodyView
          label="Back"
          muscles={BACK_MUSCLES}
          viewBox={BACK_VIEW_BOX}
          width={width}
          height={height}
          primaryMuscle={primaryMuscle}
          secondaryMuscles={secondaryMuscles}
          onTapMuscle={onTapMuscle}
        />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {primaryMuscle && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-1.5">
            <Text className="caption font-body-semibold text-brand-iron">Primary: {formatMuscleLabel(primaryMuscle)}</Text>
          </View>
        )}
        {secondaryMuscles.map((group) => (
          <View key={group} className="flex-row items-center gap-1.5 rounded-full bg-success px-3 py-1.5">
            <Text className="caption font-body-semibold text-brand-iron">{formatMuscleLabel(group)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
