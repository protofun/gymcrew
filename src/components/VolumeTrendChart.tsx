import { Fragment, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const CHART_HEIGHT = 120;
const CHART_WIDTH = 340;
const BAR_RADIUS = 4;
const MAX_BARS = 8;
// Reserved on the left for the Y-axis value labels — bars only occupy the remaining
// (CHART_WIDTH - Y_AXIS_WIDTH) columns.
const Y_AXIS_WIDTH = 34;
const PLOT_WIDTH = CHART_WIDTH - Y_AXIS_WIDTH;
const Y_TICK_COUNT = 3;

type VolumeTrendChartProps = {
  /** All workouts, newest first (as stored) — this chart shows up to the last 8, oldest to newest. */
  workouts: CompletedWorkout[];
  currentWorkoutId: string;
};

export function VolumeTrendChart({ workouts, currentWorkoutId }: VolumeTrendChartProps) {
  const recent = workouts.slice(0, MAX_BARS).slice().reverse(); // oldest -> newest, left to right
  const maxVolume = Math.max(...recent.map((w) => w.volumeKg), 1);

  const [renderedWidth, setRenderedWidth] = useState(CHART_WIDTH);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // PanResponder is created once, so its handlers must read fresh values through
  // refs rather than closing over render-time state/props (which would go stale).
  const renderedWidthRef = useRef(renderedWidth);
  renderedWidthRef.current = renderedWidth;
  const barCountRef = useRef(recent.length);
  barCountRef.current = recent.length;

  function handleTouch(locationX: number) {
    const width = renderedWidthRef.current;
    const count = barCountRef.current;
    if (width <= 0 || count < 1) return;
    const yAxisFraction = Y_AXIS_WIDTH / CHART_WIDTH;
    const ratio = Math.min(1, Math.max(0, (locationX / width - yAxisFraction) / (1 - yAxisFraction)));
    const index = Math.min(count - 1, Math.floor(ratio * count));
    setActiveIndex(index);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => handleTouch(event.nativeEvent.locationX),
      onPanResponderMove: (event) => handleTouch(event.nativeEvent.locationX),
      onPanResponderRelease: () => setActiveIndex(null),
      onPanResponderTerminate: () => setActiveIndex(null),
    }),
  ).current;

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
  const barWidth = (PLOT_WIDTH - gap * (barCount - 1)) / barCount;

  // Evenly spaced volume gridlines, highest first — e.g. [4000, 2000, 0].
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = Math.round((maxVolume * (Y_TICK_COUNT - 1 - i)) / (Y_TICK_COUNT - 1));
    return { value, y: CHART_HEIGHT - (value / maxVolume) * CHART_HEIGHT };
  });

  const active = activeIndex !== null ? recent[activeIndex] : null;
  const pxPerUnit = renderedWidth / CHART_WIDTH;
  const tooltipWidth = 96;
  const activeCenterX = activeIndex !== null ? Y_AXIS_WIDTH + activeIndex * (barWidth + gap) + barWidth / 2 : 0;
  const tooltipLeft = active ? Math.max(0, Math.min(renderedWidth - tooltipWidth, activeCenterX * pxPerUnit - tooltipWidth / 2)) : 0;

  return (
    <View className="gap-3">
      <Text className="body-md font-body-semibold text-text-primary">Volume Trend</Text>
      <View
        onLayout={(event) => setRenderedWidth(event.nativeEvent.layout.width)}
        style={{ position: "relative" }}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={CHART_HEIGHT + 24} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 24}`}>
          {yTicks.map((tick, index) => (
            <Fragment key={index}>
              <Line
                x1={Y_AXIS_WIDTH}
                y1={tick.y}
                x2={CHART_WIDTH}
                y2={tick.y}
                stroke={colors.neutral.divider}
                strokeWidth={1}
                strokeDasharray="2,4"
              />
              <SvgText x={Y_AXIS_WIDTH - 6} y={Math.max(9, tick.y - 2)} fontSize={9} fill={colors.neutral.textSecondary} textAnchor="end">
                {tick.value}
              </SvgText>
            </Fragment>
          ))}

          {recent.map((workout, index) => {
            const isCurrent = workout.id === currentWorkoutId;
            const isActive = index === activeIndex;
            const barHeight = Math.max(4, (workout.volumeKg / maxVolume) * CHART_HEIGHT);
            const x = Y_AXIS_WIDTH + index * (barWidth + gap);
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
                stroke={isActive ? colors.brand.yellow : "none"}
                strokeWidth={isActive ? 2 : 0}
                opacity={isActive || activeIndex === null ? 1 : 0.5}
              />
            );
          })}

          {/* Direct label only on the current session — labeling every bar would clutter a chart this small. */}
          {recent.map((workout, index) => {
            if (workout.id !== currentWorkoutId) return null;
            const barHeight = Math.max(4, (workout.volumeKg / maxVolume) * CHART_HEIGHT);
            const x = Y_AXIS_WIDTH + index * (barWidth + gap) + barWidth / 2;
            const y = CHART_HEIGHT - barHeight - 8;
            return (
              <SvgText key={workout.id} x={x} y={y} fontSize={11} fontWeight="700" fill={colors.neutral.textPrimary} textAnchor="middle">
                {workout.volumeKg.toLocaleString("en-US")}
              </SvgText>
            );
          })}

          {recent.map((workout, index) => {
            const x = Y_AXIS_WIDTH + index * (barWidth + gap) + barWidth / 2;
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

        {active && (
          <View
            pointerEvents="none"
            className="absolute items-center rounded-lg border border-brand-yellow bg-surface px-2.5 py-1.5"
            style={{ left: tooltipLeft, top: 4, width: tooltipWidth }}
          >
            <Text className="caption font-body-bold text-brand-yellow">{active.volumeKg.toLocaleString("en-US")} kg</Text>
            <Text className="caption text-text-secondary">
              {new Date(active.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
