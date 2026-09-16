import { useState } from "react";
import { Text, View } from "react-native";
import { LineChart, type lineDataItem } from "react-native-gifted-charts";

import { colors, fontFamily } from "@/theme";

const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 34;
// Wide enough to keep each date label legible — more points just make the chart wider (scrolled
// horizontally, handled internally by the chart), never cramped, which is what lets this show
// real history instead of a fixed 8.
const POINT_SPACING = 46;
const MAX_POINTS = 30;
const Y_TICK_COUNT = 3;

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

function formatDateShort(dateMs: number): string {
  return new Date(dateMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A scrollable trend line+area — up to 30 sessions instead of a fixed 8, since a real trend (is
 * this actually going up over weeks/months, not just the last couple of sessions) needs more than
 * a handful of points to mean anything. Colored green when the newest point in view beats the
 * oldest, red when it doesn't — this session's own point is marked in brand yellow so it's easy
 * to find "you are here" in a longer line. */
export function MetricTrendChart({ points, emptyLabel, formatValue }: MetricTrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const recent = points.slice(0, MAX_POINTS).slice().reverse(); // oldest -> newest, left to right
  const count = recent.length;

  if (count < 2) {
    return (
      <View className="items-center py-10">
        <Text className="body-sm text-text-secondary">{emptyLabel}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...recent.map((point) => point.value), 1);
  const improved = recent[count - 1].value >= recent[0].value;
  const accentColor = improved ? colors.semantic.success : colors.semantic.error;

  const data: lineDataItem[] = recent.map((point) => ({
    value: point.value,
    label: formatDateShort(point.dateMs),
    labelTextStyle: { fontFamily: fontFamily.bodyRegular, fontSize: 9, color: point.isCurrent ? colors.brand.yellow : colors.neutral.textSecondary },
    dataPointColor: point.isCurrent ? colors.brand.yellow : accentColor,
    dataPointRadius: point.isCurrent ? 5 : 3,
    customDataPoint: point.isCurrent
      ? () => (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.brand.yellow,
              borderWidth: 2,
              borderColor: colors.neutral.background,
            }}
          />
        )
      : undefined,
  }));

  return (
    <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
      {chartWidth > 0 && (
        <LineChart
          data={data}
          width={chartWidth}
          spacing={POINT_SPACING}
          initialSpacing={16}
          endSpacing={16}
          height={CHART_HEIGHT}
          color={accentColor}
          thickness={2.5}
          dataPointsHeight={10}
          dataPointsWidth={10}
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
          yAxisTextStyle={{ fontFamily: fontFamily.bodyRegular, fontSize: 9, color: colors.neutral.textSecondary }}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          backgroundColor="transparent"
          showScrollIndicator={false}
          pointerConfig={{
            showPointerStrip: false,
            pointerComponent: () => null,
            activatePointersInstantlyOnTouch: true,
            pointerLabelWidth: 96,
            pointerLabelHeight: 50,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (_items: lineDataItem[], _secondary: lineDataItem[], pointerIndex: number) => {
              const point = recent[pointerIndex];
              return (
                <View className="items-center rounded-lg border border-brand-yellow bg-surface px-2.5 py-1.5" style={{ width: 96 }}>
                  <Text className="caption font-body-bold text-brand-yellow">{formatValue(point.value)}</Text>
                  <Text className="caption text-text-secondary">{formatDateShort(point.dateMs)}</Text>
                </View>
              );
            },
          }}
        />
      )}
    </View>
  );
}
