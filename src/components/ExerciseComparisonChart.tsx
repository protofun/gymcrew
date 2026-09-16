import { useState } from "react";
import { Text, View } from "react-native";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";

import { colors, fontFamily } from "@/theme";

const CHART_HEIGHT = 140;
const Y_AXIS_WIDTH = 34;
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

function truncateLabel(label: string): string {
  return label.length > 9 ? `${label.slice(0, 8)}…` : label;
}

const axisTextStyle = { fontFamily: fontFamily.bodyRegular, fontSize: 9, color: colors.neutral.textSecondary };

/** This workout's per-exercise volume, overlaid against the previous session that trained the
 * same exercises — a solid green/red area+line for "now" (green if you beat that session's total,
 * red if not) against a dashed neutral line for "last time", so progress (or its absence) reads
 * at a glance instead of needing to compare two separate bar lists by eye. */
export function ExerciseComparisonChart({ points, previousLabel, emptyLabel }: ExerciseComparisonChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

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

  const data: lineDataItem[] = points.map((point) => ({
    value: point.current,
    label: truncateLabel(point.label),
    labelTextStyle: axisTextStyle,
    dataPointColor: accentColor,
    dataPointRadius: 3.5,
  }));

  // Previous values default missing entries to 0 (matching the original path, which drew straight
  // through 0 rather than skipping a gap) but hides the dot at those points.
  const data2: lineDataItem[] | undefined = hasPrevious
    ? points.map((point) => ({
        value: point.previous ?? 0,
        hideDataPoint: point.previous === null,
        dataPointRadius: 3,
        customDataPoint: () => (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.neutral.background,
              borderWidth: 1.5,
              borderColor: colors.neutral.textSecondary,
            }}
          />
        ),
      }))
    : undefined;

  return (
    <View className="gap-3">
      <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
        {chartWidth > 0 && (
          <LineChart
            data={data}
            data2={data2}
            parentWidth={chartWidth}
            adjustToWidth
            height={CHART_HEIGHT}
            initialSpacing={8}
            endSpacing={8}
            color={accentColor}
            thickness={2.5}
            color2={colors.neutral.textSecondary}
            thickness2={2}
            strokeDashArray2={[6, 5]}
            areaChart
            startFillColor={accentColor}
            endFillColor={accentColor}
            startOpacity={0.35}
            endOpacity={0}
            noOfSections={Y_TICK_COUNT - 1}
            maxValue={maxValue}
            roundToDigits={0}
            rulesType="dashed"
            rulesColor={colors.neutral.divider}
            xAxisColor={colors.neutral.divider}
            yAxisColor={colors.neutral.divider}
            yAxisTextStyle={axisTextStyle}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            backgroundColor="transparent"
          />
        )}
      </View>

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
