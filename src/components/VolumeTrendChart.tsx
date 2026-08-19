import { useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

import type { CompletedWorkout } from "@/store/workout-history-store";
import { colors } from "@/theme";

const CHART_HEIGHT = 120;
const CHART_WIDTH = 340;
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
    const ratio = Math.min(1, Math.max(0, locationX / width));
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
  const chartWidth = CHART_WIDTH;
  const barWidth = (chartWidth - gap * (barCount - 1)) / barCount;

  const active = activeIndex !== null ? recent[activeIndex] : null;
  const pxPerUnit = renderedWidth / chartWidth;
  const tooltipWidth = 96;
  const activeCenterX = activeIndex !== null ? activeIndex * (barWidth + gap) + barWidth / 2 : 0;
  const tooltipLeft = active ? Math.max(0, Math.min(renderedWidth - tooltipWidth, activeCenterX * pxPerUnit - tooltipWidth / 2)) : 0;

  return (
    <View className="gap-3">
      <Text className="body-md font-body-semibold text-text-primary">Volume Trend</Text>
      <View
        onLayout={(event) => setRenderedWidth(event.nativeEvent.layout.width)}
        style={{ position: "relative" }}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={CHART_HEIGHT + 24} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 24}`}>
          {recent.map((workout, index) => {
            const isCurrent = workout.id === currentWorkoutId;
            const isActive = index === activeIndex;
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
