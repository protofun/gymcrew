import { StrengthProgressChart } from "@/components/StrengthProgressChart";
import type { TrendPoint } from "@/components/TrendChart";

/** Web version of TrendChart — the app's existing area chart (react-native-gifted-charts) instead of the
 * Skia canvas of Reacticx's line-chart. */
export function TrendChart({ points, unit, title = "Trend" }: { points: TrendPoint[]; unit: string; title?: string }) {
  return <StrengthProgressChart exerciseName={title} points={points} title={title} unit={unit} area />;
}
