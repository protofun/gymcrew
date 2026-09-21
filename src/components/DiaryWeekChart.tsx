import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BarChart } from "@/components/ui/charts/bar-chart";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

export type WeekDay = { label: string; calories: number };

type DiaryWeekChartProps = {
  days: WeekDay[];
  /** Daily calorie target — `null` when none is set. */
  target: number | null;
  /** Section title, all caps (default "THIS WEEK"). */
  title?: string;
};

/** The viewed week as seven bars of calories eaten (Reacticx `bar-chart`, a Skia canvas — native only;
 * the web build uses DiaryWeekChart.web.tsx). Drag a finger across it to read single days. */
export function DiaryWeekChart({ days, target, title = "THIS WEEK" }: DiaryWeekChartProps) {
  const loggedDays = days.filter((day) => day.calories > 0);
  const average = loggedDays.length > 0 ? Math.round(loggedDays.reduce((sum, day) => sum + day.calories, 0) / loggedDays.length) : 0;
  const onTarget = target ? loggedDays.filter((day) => day.calories >= target * 0.9 && day.calories <= target * 1.1).length : 0;
  const maxY = Math.max(target ?? 0, ...days.map((day) => day.calories), 1000) * 1.15;

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} className="gap-4">
      <View className="flex-row items-baseline justify-between">
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 30, letterSpacing: 1, color: colors.brand.white }}>{title}</Text>
        <View className="flex-row items-baseline gap-1">
          <NumberFlow value={average} fontSize={18} color={colors.brand.white} fontWeight="800" />
          <Text className="caption font-body-semibold text-text-secondary">kcal / day</Text>
        </View>
      </View>

      <BarChart.Root data={days.map((day) => ({ label: day.label, value: day.calories }))} maxY={maxY} tickCount={4} leftInset={0} style={{ height: 150 }}>
        <BarChart.Grid color={colors.neutral.divider} />
        <BarChart.Highlight color="rgba(255,255,255,0.05)" />
        <BarChart.Bars color={NUTRITION_COLORS.calories} activeColor={colors.brand.yellow} radius={8} />
        <BarChart.XAxis style={{ color: colors.neutral.textSecondary, fontSize: 11 }} activeStyle={{ color: colors.brand.white, fontSize: 11 }} />
      </BarChart.Root>

      {target !== null && (
        <Text className="caption text-text-secondary">
          {`Goal ${target.toLocaleString()} kcal · ${onTarget} ${onTarget === 1 ? "day" : "days"} on target`}
        </Text>
      )}
    </Animated.View>
  );
}
