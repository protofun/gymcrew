import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

export type WeekDay = { label: string; calories: number };

type DiaryWeekChartProps = {
  days: WeekDay[];
  target: number | null;
  /** Section title, all caps (default "THIS WEEK"). */
  title?: string;
};

const CHART_HEIGHT = 130;

function Bar({ index, ratio, label }: { index: number; ratio: number; label: string }) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(index * 70, withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [index, ratio, grow]);

  const barStyle = useAnimatedStyle(() => ({ height: Math.max(grow.value * CHART_HEIGHT, 3) }));

  return (
    <View className="flex-1 items-center gap-2">
      <View style={{ height: CHART_HEIGHT }} className="justify-end">
        <Animated.View style={[{ width: 22, borderRadius: 8, backgroundColor: NUTRITION_COLORS.calories }, barStyle]} />
      </View>
      <Text className="caption text-text-secondary">{label}</Text>
    </View>
  );
}

/** Web version of DiaryWeekChart — the same seven bars, drawn with plain animated views instead of
 * the Skia canvas of Reacticx's bar-chart. */
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

      <View className="flex-row">
        {days.map((day, index) => (
          <Bar key={day.label + index} index={index} ratio={day.calories / maxY} label={day.label} />
        ))}
      </View>

      {target !== null && (
        <Text className="caption text-text-secondary">
          {`Goal ${target.toLocaleString()} kcal · ${onTarget} ${onTarget === 1 ? "day" : "days"} on target`}
        </Text>
      )}
    </Animated.View>
  );
}
