import { LineChart } from "@/components/ui/charts/line-chart";
import { fromDateKey } from "@/lib/date";
import { colors, fontFamily } from "@/theme";

export type TrendPoint = { date: string; value: number };

type TrendChartProps = {
  points: TrendPoint[];
  unit: string;
  /** Only used by the web version, which shows it as the chart's heading. */
  title?: string;
};

/** A metric over time as a smooth glowing line (Reacticx `line-chart`, a Skia canvas — native only; the
 * web build uses TrendChart.web.tsx). Drag a finger along it to read any day. */
export function TrendChart({ points, unit }: TrendChartProps) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(1, (max - min) * 0.25);

  return (
    <LineChart.Root data={points.map((point, index) => ({ x: index, y: point.value }))} curve="natural" minY={min - pad} maxY={max + pad} horizontalPadding={10} verticalPadding={18} style={{ height: 200 }}>
      <LineChart.Grid count={4} color={colors.neutral.divider} />
      <LineChart.Area colors={[colors.brand.yellow, "transparent"]} opacity={0.3} />
      <LineChart.Line color={colors.brand.yellow} thickness={3} />
      <LineChart.Indicator color={colors.brand.yellow} borderColor={colors.neutral.background} pulsating />
      <LineChart.Cursor color={colors.brand.white} borderColor={colors.brand.yellow} showCrosshair crosshairColor="rgba(255,255,255,0.25)" />
      <LineChart.Tooltip
        format={(point, index) => `${fromDateKey(points[index]?.date ?? points[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${Math.round(point.y * 10) / 10}${unit}`}
        style={{ backgroundColor: colors.neutral.surfaceElevated, borderRadius: 12 }}
        textStyle={{ color: colors.brand.white, fontFamily: fontFamily.bodySemiBold, fontSize: 12 }}
      />
    </LineChart.Root>
  );
}
