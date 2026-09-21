import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { colors, fontFamily } from "@/theme";

export type TopFood = { name: string; count: number };

/** The foods you log most, as a leaderboard: a big rank number, the name, and a bar showing how it stacks up
 * against the number one. */
export function HistoryTopFoods({ foods }: { foods: TopFood[] }) {
  const max = Math.max(...foods.map((food) => food.count), 1);

  return (
    <View>
      {foods.map((food, index) => (
        <Animated.View key={food.name} entering={FadeInDown.delay(index * 70).springify().damping(16)} className={`flex-row items-center gap-4 py-3 ${index === foods.length - 1 ? "" : "border-b border-divider"}`}>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 34, width: 34, color: index === 0 ? colors.brand.yellow : colors.neutral.textSecondary }}>{index + 1}</Text>
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text numberOfLines={1} className="flex-1" style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 15, color: colors.brand.white }}>
                {food.name}
              </Text>
              <Text className="caption font-body-semibold text-text-secondary">{`${food.count}×`}</Text>
            </View>
            <AnimatedProgressBar progress={food.count / max} height={5} borderRadius={3} progressColor={index === 0 ? colors.brand.yellow : "rgba(227,255,0,0.4)"} trackColor={colors.neutral.divider} animationDuration={700 + index * 120} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
