import { Text, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const CHART_HEIGHT = 120;
const BAR_RADIUS = 4;
const MAX_BARS = 8;

type VolumeTrendChartProps = {
  /** All workouts, newest first (as stored) — this chart shows up to the last 8, oldest to newest. */
  workouts: CompletedWorkout[];
  currentWorkoutId: string;
};

export function VolumeTrendChart({ workouts, currentWorkoutId }: VolumeTrendChartProps) {
  const recent = workouts.slice(0, MAX_BARS).slice().reverse(); // oldest -> newest, left to right
  const maxVolume = Math.max(...recent.map((w) => w.volumeKg), 1);

  if (recent.length < 2) {
    return (
      <View className="gap-2">
        <Text className="body-md font-body-semibold text-text-primary">Volume Trend</Text>
        <Text className="body-sm text-text-secondary">Log a few more workouts to see your trend here.</Text>
      </View>
    );
  }

  const barCount = recent.length;
  const gap = 10;
  const chartWidth = 340;
  const barWidth = (chartWidth - gap * (barCount - 1)) / barCount;

  return (
    <View className="gap-3">
      <Text className="body-md font-body-semibold text-text-primary">Volume Trend</Text>
      <Svg width="100%" height={CHART_HEIGHT + 24} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 24}`}>
        {recent.map((workout, index) => {
          const isCurrent = workout.id === currentWorkoutId;
          const barHeight = Math.max(4, (workout.volumeKg / maxVolume) * CHART_HEIGHT);
          const x = index * (barWidth + gap);
          const y = CHART_HEIGHT - barHeight;

          return (
            <Rect
              key={workout.id}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={BAR_RADIUS}
              fill={isCurrent ? colors.brand.yellow : colors.neutral.divider}
            />
          );
        })}

        {/* Direct label only on the current session — labeling every bar would clutter a chart this small. */}
        {recent.map((workout, index) => {
          if (workout.id !== currentWorkoutId) return null;
          const barHeight = Math.max(4, (workout.volumeKg / maxVolume) * CHART_HEIGHT);
          const x = index * (barWidth + gap) + barWidth / 2;
          const y = CHART_HEIGHT - barHeight - 8;
          return (
            <SvgText key={workout.id} x={x} y={y} fontSize={11} fontWeight="700" fill={colors.neutral.textPrimary} textAnchor="middle">
              {workout.volumeKg.toLocaleString("en-US")}
            </SvgText>
          );
        })}

        {recent.map((workout, index) => {
          const x = index * (barWidth + gap) + barWidth / 2;
          const isCurrent = workout.id === currentWorkoutId;
          return (
            <SvgText
              key={`label-${workout.id}`}
              x={x}
              y={CHART_HEIGHT + 18}
              fontSize={10}
              fill={isCurrent ? colors.brand.yellow : colors.neutral.textSecondary}
              textAnchor="middle"
            >
              {new Date(workout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
