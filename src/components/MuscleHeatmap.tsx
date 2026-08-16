import { BACK_MUSCLES, FRONT_MUSCLES } from "body-muscles";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { MuscleGroup } from "@/data/workout-log";
import { colors } from "@/theme";

const FRONT_VIEW_BOX = "0 0 35 93";
const BACK_VIEW_BOX = "37 0 35 93";
const BODY_ASPECT_RATIO = 35 / 93;

// Maps our simplified workout-log muscle groups onto the body-muscles
// package's finer-grained anatomical region ids (front + back views).
const MUSCLE_GROUP_IDS: Record<MuscleGroup, string[]> = {
  chest: ["chest-upper-left", "chest-upper-right", "chest-lower-left", "chest-lower-right"],
  shoulders: [
    "shoulder-front-left",
    "shoulder-front-right",
    "shoulder-side-left",
    "shoulder-side-right",
    "deltoid-rear-left",
    "deltoid-rear-right",
  ],
  back: [
    "lats-upper-left",
    "lats-mid-left",
    "lats-lower-left",
    "lats-upper-right",
    "lats-mid-right",
    "lats-lower-right",
    "traps-upper-left",
    "traps-mid-left",
    "traps-lower-left",
    "traps-upper-right",
    "traps-mid-right",
    "traps-lower-right",
    "lower-back-erectors-left",
    "lower-back-erectors-right",
    "lower-back-ql-left",
    "lower-back-ql-right",
    "spine",
  ],
  biceps: ["biceps-left", "biceps-right"],
  triceps: ["triceps-long-left", "triceps-lateral-left", "triceps-long-right", "triceps-lateral-right"],
  abs: [
    "abs-upper-left",
    "abs-upper-right",
    "abs-lower-left",
    "abs-lower-right",
    "obliques-left",
    "obliques-right",
    "serratus-anterior-left",
    "serratus-anterior-right",
  ],
  quads: ["quads-left", "quads-right", "hip-flexor-left", "hip-flexor-right"],
  hamstrings: ["hamstrings-medial-left", "hamstrings-lateral-left", "hamstrings-medial-right", "hamstrings-lateral-right"],
  calves: [
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-soleus-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "calves-soleus-right",
    "tibialis-anterior-left",
    "tibialis-anterior-right",
  ],
  glutes: ["gluteus-medius-left", "gluteus-maximus-left", "gluteus-medius-right", "gluteus-maximus-right"],
};

const INTENSITY_BY_MUSCLE_ID = new Map<string, MuscleGroup>();
for (const [group, ids] of Object.entries(MUSCLE_GROUP_IDS) as [MuscleGroup, string[]][]) {
  for (const id of ids) INTENSITY_BY_MUSCLE_ID.set(id, group);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

// A trained muscle glows in the app's signature yellow-green — the same
// lime color as the "Start Workout" button, the XP bar, and the calendar's
// trained-day dots. Low intensity is a muted, washed-out version of it, max
// intensity is the full vivid brand yellow, so light vs. heavy training reads clearly.
const MUTED_BASE_RGB = hexToRgb(colors.neutral.textSecondary);
const ACCENT_RGB = hexToRgb(colors.brand.yellow);
const INTENSITY_LOW = mixRgb(MUTED_BASE_RGB, ACCENT_RGB, 0.35);
const INTENSITY_HIGH = ACCENT_RGB;

export function intensityToColor(intensity: number): string {
  const t = Math.max(0, Math.min(10, intensity)) / 10;
  const { r, g, b } = mixRgb(INTENSITY_LOW, INTENSITY_HIGH, t);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function intensityForMuscleId(id: string, muscleIntensity: Partial<Record<MuscleGroup, number>>): number {
  const group = INTENSITY_BY_MUSCLE_ID.get(id);
  return (group ? muscleIntensity[group] : undefined) ?? 0;
}

export function formatMuscleLabel(group: MuscleGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
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
