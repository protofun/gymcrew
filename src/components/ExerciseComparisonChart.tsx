import { Fragment } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { colors } from "@/theme";

const CHART_HEIGHT = 140;
const CHART_WIDTH = 340;
const Y_AXIS_WIDTH = 34;
const PLOT_WIDTH = CHART_WIDTH - Y_AXIS_WIDTH;
const Y_TICK_COUNT = 3;

export type ComparisonPoint = {
  id: string;
  label: string;
  current: number;
  /** `null` when this exercise wasn't part of the matched previous session. */
  previous: number | null;
};

type ExerciseComparisonChartProps = {
  points: ComparisonPoint[];
  previousLabel: string;
  emptyLabel: string;
};

/** This workout's per-exercise volume, overlaid against the previous session that trained the
 * same exercises — a solid green/red area+line for "now" (green if you beat that session's total,
 * red if not) against a dashed neutral line for "last time", so progress (or its absence) reads
 * at a glance instead of needing to compare two separate bar lists by eye. */
export function ExerciseComparisonChart({ points, previousLabel, emptyLabel }: ExerciseComparisonChartProps) {
  if (points.length === 0) {
    return (
      <View className="items-center py-10">
        <Text className="body-sm text-text-secondary">{emptyLabel}</Text>
      </View>
    );
  }

  const hasPrevious = points.some((point) => point.previous !== null);
  const totalCurrent = points.reduce((sum, point) => sum + point.current, 0);
  const totalPrevious = points.reduce((sum, point) => sum + (point.previous ?? 0), 0);
  const improved = !hasPrevious || totalCurrent >= totalPrevious;
  const accentColor = improved ? colors.semantic.success : colors.semantic.error;

  const maxValue = Math.max(...points.map((point) => point.current), ...points.map((point) => point.previous ?? 0), 1);
  const count = points.length;
  const stepX = count > 1 ? PLOT_WIDTH / (count - 1) : 0;

  function xFor(index: number) {
    return count > 1 ? Y_AXIS_WIDTH + index * stepX : Y_AXIS_WIDTH + PLOT_WIDTH / 2;
  }
  function yFor(value: number) {
    return CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
  }

  const currentLinePath = points.map((point, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(point.current)}`).join(" ");
  const currentAreaPath = `${currentLinePath} L ${xFor(count - 1)} ${CHART_HEIGHT} L ${xFor(0)} ${CHART_HEIGHT} Z`;
  const previousLinePath = hasPrevious
    ? points.map((point, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(point.previous ?? 0)}`).join(" ")
    : null;

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = Math.round((maxValue * (Y_TICK_COUNT - 1 - i)) / (Y_TICK_COUNT - 1));
    return { value, y: yFor(value) };
  });

  return (
    <View className="gap-3">
      <Svg width="100%" height={CHART_HEIGHT + 28} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 28}`}>
        <Defs>
          <LinearGradient id="exerciseComparisonFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

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

        <Path d={currentAreaPath} fill="url(#exerciseComparisonFill)" />
        {previousLinePath && <Path d={previousLinePath} stroke={colors.neutral.textSecondary} strokeWidth={2} strokeDasharray="6,5" fill="none" />}
        <Path d={currentLinePath} stroke={accentColor} strokeWidth={2.5} fill="none" />

        {points.map((point, i) => (
          <Circle key={point.id} cx={xFor(i)} cy={yFor(point.current)} r={3.5} fill={accentColor} />
        ))}
        {points.map(
          (point, i) =>
            point.previous !== null && (
              <Circle
                key={`prev-${point.id}`}
                cx={xFor(i)}
                cy={yFor(point.previous)}
                r={3}
                fill={colors.neutral.background}
                stroke={colors.neutral.textSecondary}
                strokeWidth={1.5}
              />
            ),
        )}

        {points.map((point, i) => (
          <SvgText key={`label-${point.id}`} x={xFor(i)} y={CHART_HEIGHT + 18} fontSize={9} fill={colors.neutral.textSecondary} textAnchor="middle">
            {point.label.length > 9 ? `${point.label.slice(0, 8)}…` : point.label}
          </SvgText>
        ))}
      </Svg>

      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 14, height: 2, backgroundColor: accentColor }} />
          <Text className="caption text-text-secondary">This workout</Text>
        </View>
        {hasPrevious && (
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 14, height: 2, backgroundColor: colors.neutral.textSecondary }} />
            <Text className="caption text-text-secondary">{previousLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
