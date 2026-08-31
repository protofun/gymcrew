import { Fragment, useRef, useState } from "react";
import { PanResponder, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { colors } from "@/theme";

const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 34;
// Wide enough to keep each date label legible — more points just make the chart wider (scrolled
// horizontally), never cramped, which is what lets this show real history instead of a fixed 8.
const POINT_SPACING = 46;
const MIN_PLOT_WIDTH = 300;
const MAX_POINTS = 30;
const Y_TICK_COUNT = 3;
const TOOLTIP_WIDTH = 96;

let gradientIdCounter = 0;

export type TrendPoint = {
  id: string;
  value: number;
  dateMs: number;
  isCurrent: boolean;
};

type MetricTrendChartProps = {
  /** Newest-first, like workout history is stored — up to the last `MAX_POINTS` are shown, oldest
   * to newest, left to right. */
  points: TrendPoint[];
  emptyLabel: string;
  formatValue: (value: number) => string;
};

/** A scrollable trend line+area — up to 30 sessions instead of a fixed 8, since a real trend (is
 * this actually going up over weeks/months, not just the last couple of sessions) needs more than
 * a handful of points to mean anything. Colored green when the newest point in view beats the
 * oldest, red when it doesn't — this session's own point is marked in brand yellow so it's easy
 * to find "you are here" in a longer line. */
export function MetricTrendChart({ points, emptyLabel, formatValue }: MetricTrendChartProps) {
  const idRef = useRef<string | undefined>(undefined);
  if (!idRef.current) idRef.current = `trend-fill-${gradientIdCounter++}`;
  const gradientId = idRef.current;

  const recent = points.slice(0, MAX_POINTS).slice().reverse(); // oldest -> newest, left to right
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const count = recent.length;

  const plotWidthRef = useRef(MIN_PLOT_WIDTH);
  plotWidthRef.current = Math.max(MIN_PLOT_WIDTH, POINT_SPACING * (count - 1));

  function handleTouch(locationX: number) {
    const plotWidth = plotWidthRef.current;
    if (count < 2 || plotWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, (locationX - Y_AXIS_WIDTH) / plotWidth));
    setActiveIndex(Math.min(count - 1, Math.round(ratio * (count - 1))));
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

  if (count < 2) {
    return (
      <View className="items-center py-10">
        <Text className="body-sm text-text-secondary">{emptyLabel}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...recent.map((point) => point.value), 1);
  const plotWidth = plotWidthRef.current;
  const chartWidth = Y_AXIS_WIDTH + plotWidth + 16;

  function xFor(index: number) {
    return Y_AXIS_WIDTH + (count > 1 ? (index * plotWidth) / (count - 1) : plotWidth / 2);
  }
  function yFor(value: number) {
    return CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
  }

  const improved = recent[count - 1].value >= recent[0].value;
  const accentColor = improved ? colors.semantic.success : colors.semantic.error;

  const linePath = recent.map((point, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(point.value)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(count - 1)} ${CHART_HEIGHT} L ${xFor(0)} ${CHART_HEIGHT} Z`;

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = Math.round((maxValue * (Y_TICK_COUNT - 1 - i)) / (Y_TICK_COUNT - 1));
    return { value, y: yFor(value) };
  });

  const active = activeIndex !== null ? recent[activeIndex] : null;
  const tooltipLeft = activeIndex !== null ? Math.max(0, Math.min(chartWidth - TOOLTIP_WIDTH, xFor(activeIndex) - TOOLTIP_WIDTH / 2)) : 0;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
      <View style={{ width: chartWidth, position: "relative" }} {...panResponder.panHandlers}>
        <Svg width={chartWidth} height={CHART_HEIGHT + 24}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {yTicks.map((tick, index) => (
            <Fragment key={index}>
              <Line
                x1={Y_AXIS_WIDTH}
                y1={tick.y}
                x2={chartWidth}
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

          <Path d={areaPath} fill={`url(#${gradientId})`} />
          <Path d={linePath} stroke={accentColor} strokeWidth={2.5} fill="none" />

          {recent.map((point, i) => (
            <Circle
              key={point.id}
              cx={xFor(i)}
              cy={yFor(point.value)}
              r={point.isCurrent ? 5 : 3}
              fill={point.isCurrent ? colors.brand.yellow : accentColor}
              stroke={point.isCurrent ? colors.neutral.background : "none"}
              strokeWidth={point.isCurrent ? 2 : 0}
            />
          ))}

          {recent.map((point, i) => (
            <SvgText
              key={`label-${point.id}`}
              x={xFor(i)}
              y={CHART_HEIGHT + 18}
              fontSize={9}
              fill={point.isCurrent ? colors.brand.yellow : colors.neutral.textSecondary}
              textAnchor="middle"
            >
              {new Date(point.dateMs).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </SvgText>
          ))}
        </Svg>

        {active && (
          <View
            pointerEvents="none"
            className="absolute items-center rounded-lg border border-brand-yellow bg-surface px-2.5 py-1.5"
            style={{ left: tooltipLeft, top: 4, width: TOOLTIP_WIDTH }}
          >
            <Text className="caption font-body-bold text-brand-yellow">{formatValue(active.value)}</Text>
            <Text className="caption text-text-secondary">
              {new Date(active.dateMs).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
