import { Fragment, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { fromDateKey } from "@/lib/date";
import type { StrengthPoint } from "@/lib/member-mock-profile";
import { colors } from "@/theme";

const CHART_WIDTH = 340;
const CHART_HEIGHT = 140;
const CHART_PADDING = 12;
// Reserved on the left for the Y-axis value labels — the plotted line only occupies the remaining
// (CHART_WIDTH - Y_AXIS_WIDTH) columns.
const Y_AXIS_WIDTH = 32;
const PLOT_WIDTH = CHART_WIDTH - Y_AXIS_WIDTH;
const Y_TICK_COUNT = 3;

function formatDateShort(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type StrengthProgressChartProps = {
  exerciseName: string;
  points: StrengthPoint[];
  title?: string;
  unit?: string;
};

export function StrengthProgressChart({ exerciseName, points, title = "Strength Progress", unit = "kg" }: StrengthProgressChartProps) {
  const [renderedWidth, setRenderedWidth] = useState(CHART_WIDTH);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // PanResponder is created once, so its handlers must read fresh values through
  // refs rather than closing over render-time state/props (which would go stale).
  const renderedWidthRef = useRef(renderedWidth);
  renderedWidthRef.current = renderedWidth;
  const pointCountRef = useRef(points.length);
  pointCountRef.current = points.length;

  function handleTouch(locationX: number) {
    const width = renderedWidthRef.current;
    const count = pointCountRef.current;
    if (width <= 0 || count < 2) return;
    const chartX = (locationX / width) * CHART_WIDTH;
    const stepX = PLOT_WIDTH / (count - 1);
    const index = Math.round((chartX - Y_AXIS_WIDTH) / stepX);
    setActiveIndex(Math.max(0, Math.min(count - 1, index)));
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

  if (points.length < 2) {
    return (
      <View className="gap-2">
        <Text className="body-md font-body-semibold text-text-primary">{title}</Text>
        <Text className="body-sm text-text-secondary">Not enough logged sets for {exerciseName} yet.</Text>
      </View>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = points.length > 1 ? PLOT_WIDTH / (points.length - 1) : 0;

  function yForValue(value: number): number {
    return CHART_HEIGHT - CHART_PADDING - ((value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
  }

  const coords = points.map((point, index) => ({ x: Y_AXIS_WIDTH + index * stepX, y: yForValue(point.value) }));

  // Evenly spaced value gridlines, highest first — e.g. [140, 110, 80] for a 80-140 range.
  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = max - (range * i) / (Y_TICK_COUNT - 1);
    return { value: Math.round(value), y: yForValue(value) };
  });

  // First, (roughly) middle, and last date — enough to read the timeline without cluttering a
  // chart this small.
  const xAxisIndices = points.length >= 3 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1];

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const delta = points[points.length - 1].value - points[0].value;
  const deltaColor = delta > 0 ? colors.semantic.success : delta < 0 ? colors.semantic.error : colors.neutral.textSecondary;

  const active = activeIndex !== null ? { point: points[activeIndex], coord: coords[activeIndex] } : null;
  const pxPerUnit = renderedWidth / CHART_WIDTH;
  const tooltipWidth = 96;
  const tooltipLeft = active ? Math.max(0, Math.min(renderedWidth - tooltipWidth, active.coord.x * pxPerUnit - tooltipWidth / 2)) : 0;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="body-md font-body-semibold text-text-primary">{title}</Text>
        <Text className="body-sm font-body-semibold" style={{ color: deltaColor }}>
          {delta > 0 ? "+" : ""}
          {delta} {unit}
        </Text>
      </View>

      <View
        onLayout={(event) => setRenderedWidth(event.nativeEvent.layout.width)}
        style={{ position: "relative" }}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
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
              <SvgText x={Y_AXIS_WIDTH - 6} y={tick.y + 3} fontSize={9} fill={colors.neutral.textSecondary} textAnchor="end">
                {tick.value}
              </SvgText>
            </Fragment>
          ))}

          <Path d={pathD} stroke={colors.brand.yellow} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((c, index) => (
            <Circle key={index} cx={c.x} cy={c.y} r={3.5} fill={colors.brand.yellow} />
          ))}
          {active && (
            <>
              <Line
                x1={active.coord.x}
                y1={0}
                x2={active.coord.x}
                y2={CHART_HEIGHT}
                stroke={colors.neutral.textSecondary}
                strokeWidth={1}
                strokeDasharray="3,4"
              />
              <Circle cx={active.coord.x} cy={active.coord.y} r={6} fill={colors.brand.white} stroke={colors.brand.yellow} strokeWidth={2.5} />
            </>
          )}
        </Svg>

        {active && (
          <View
            pointerEvents="none"
            className="absolute items-center rounded-lg border border-brand-yellow bg-surface px-2.5 py-1.5"
            style={{ left: tooltipLeft, top: 4, width: tooltipWidth }}
          >
            <Text className="caption font-body-bold text-brand-yellow">
              {active.point.value.toLocaleString("en-US")} {unit}
            </Text>
            <Text className="caption text-text-secondary">{formatDateShort(active.point.date)}</Text>
          </View>
        )}
      </View>

      <View className="flex-row justify-between" style={{ paddingLeft: Y_AXIS_WIDTH }}>
        {xAxisIndices.map((index) => (
          <Text key={index} className="caption text-text-secondary">
            {formatDateShort(points[index].date)}
          </Text>
        ))}
      </View>
    </View>
  );
}
