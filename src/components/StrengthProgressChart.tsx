import { useState } from "react";
import { Text, View } from "react-native";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";

import { fromDateKey } from "@/lib/date";
import type { StrengthPoint } from "@/lib/member-mock-profile";
import { colors, fontFamily } from "@/theme";

const CHART_HEIGHT = 140;
const Y_AXIS_WIDTH = 32;
const Y_TICK_COUNT = 3;

function formatDateShort(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const axisTextStyle = { fontFamily: fontFamily.bodyRegular, fontSize: 9, color: colors.neutral.textSecondary };

type StrengthProgressChartProps = {
  exerciseName: string;
  points: StrengthPoint[];
  title?: string;
  unit?: string;
  /** Adds a soft fill beneath the line down to the chart baseline — a heavier "how much" read for
   * metrics like weight or calories, still the same brand-yellow accent as the line itself (no new
   * color introduced), just a different chart type from the plain line default. */
  area?: boolean;
};

export function StrengthProgressChart({ exerciseName, points, title = "Strength Progress", unit = "kg", area = false }: StrengthProgressChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

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

  // First, (roughly) middle, and last date — enough to read the timeline without cluttering a
  // chart this small.
  const labeledIndices = new Set(points.length >= 3 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1]);

  const data: lineDataItem[] = points.map((point, index) => ({
    value: point.value,
    label: labeledIndices.has(index) ? formatDateShort(point.date) : "",
  }));

  // Rounded to 1 decimal — a raw float subtraction on non-integer values (e.g. a BMI series) can
  // land on something like -0.9000000000000021 due to IEEE754 imprecision.
  const delta = Math.round((points[points.length - 1].value - points[0].value) * 10) / 10;
  const deltaColor = delta > 0 ? colors.semantic.success : delta < 0 ? colors.semantic.error : colors.neutral.textSecondary;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="body-md font-body-semibold text-text-primary">{title}</Text>
        <Text className="body-sm font-body-semibold" style={{ color: deltaColor }}>
          {delta > 0 ? "+" : ""}
          {delta} {unit}
        </Text>
      </View>

      <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
        {chartWidth > 0 && (
          <LineChart
            data={data}
            parentWidth={chartWidth}
            adjustToWidth
            height={CHART_HEIGHT}
            initialSpacing={8}
            endSpacing={8}
            color={colors.brand.yellow}
            thickness={2.5}
            dataPointsColor={colors.brand.yellow}
            dataPointsRadius={3.5}
            areaChart={area}
            startFillColor={colors.brand.yellow}
            endFillColor={colors.brand.yellow}
            startOpacity={0.15}
            endOpacity={0}
            noOfSections={Y_TICK_COUNT - 1}
            yAxisOffset={min}
            maxValue={range}
            formatYLabel={(label) => String(Math.round(Number(label) + min))}
            rulesType="dashed"
            rulesColor={colors.neutral.divider}
            xAxisColor={colors.neutral.divider}
            yAxisColor={colors.neutral.divider}
            yAxisTextStyle={axisTextStyle}
            xAxisLabelTextStyle={axisTextStyle}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            backgroundColor="transparent"
            pointerConfig={{
              pointerColor: colors.brand.yellow,
              radius: 6,
              pointerStripColor: colors.neutral.textSecondary,
              pointerStripWidth: 1,
              activatePointersInstantlyOnTouch: true,
              autoAdjustPointerLabelPosition: true,
              pointerLabelWidth: 96,
              pointerLabelHeight: 50,
              pointerComponent: () => (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.brand.white,
                    borderWidth: 2.5,
                    borderColor: colors.brand.yellow,
                  }}
                />
              ),
              pointerLabelComponent: (_items: lineDataItem[], _secondary: lineDataItem[], pointerIndex: number) => {
                const point = points[pointerIndex];
                return (
                  <View className="items-center rounded-lg border border-brand-yellow bg-surface px-2.5 py-1.5" style={{ width: 96 }}>
                    <Text className="caption font-body-bold text-brand-yellow">
                      {point.value.toLocaleString("en-US")} {unit}
                    </Text>
                    <Text className="caption text-text-secondary">{formatDateShort(point.date)}</Text>
                  </View>
                );
              },
            }}
          />
        )}
      </View>
    </View>
  );
}
