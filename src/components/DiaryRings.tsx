import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeInDown, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

type Goal = { current: number; target: number };

type DiaryRingsProps = {
  /** Calories eaten today. */
  calories: number;
  /** Calorie target for the day, already including calories earned from training. */
  calorieTarget: number;
  exerciseCalories: number;
  /** Days in a row with something logged. */
  streak: number;
  protein: Goal;
  carbs: Goal;
  fat: Goal;
};

const RING_STEP = 32;

/** One ring of the stack — fills to its percentage, starting a beat after the ring outside it. */
function Ring({ outerSize, index, stroke, percent, color }: { outerSize: number; index: number; stroke: number; percent: number; color: string }) {
  const progress = useSharedValue(0);
  const size = outerSize - index * RING_STEP;

  useEffect(() => {
    progress.value = withDelay(index * 140, withTiming(Math.min(Math.max(percent, 0), 100), { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [index, percent, progress]);

  return (
    <View style={{ position: "absolute", top: (outerSize - size) / 2, left: (outerSize - size) / 2 }}>
      <CircularProgress
        progress={progress}
        size={size}
        strokeWidth={stroke}
        gap={0}
        outerCircleColor={colors.neutral.divider}
        progressCircleColor={color}
        backgroundColor="transparent"
        renderIcon={() => <View />}
      />
    </View>
  );
}

function LegendRow({ color, label, goal, unit }: { color: string; label: string; goal: Goal; unit: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: color }} />
      <View className="gap-0.5">
        <Text className="caption font-body-semibold text-text-secondary">{label}</Text>
        <View className="flex-row items-baseline gap-1">
          <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.brand.white }}>{Math.round(goal.current).toLocaleString()}</Text>
          <Text className="caption text-text-secondary">{`/ ${Math.round(goal.target).toLocaleString()} ${unit}`}</Text>
        </View>
      </View>
    </View>
  );
}

/** The day at a glance as four concentric rings — calories outside, then protein, carbs and fat — with
 * what's left in the middle. The rolling numbers, the ring fill and the line of text underneath (which
 * cycles through what's still to go) all move; the legend is plain text beside it. */
export function DiaryRings({ calories, calorieTarget, exerciseCalories, streak, protein, carbs, fat }: DiaryRingsProps) {
  const { width } = useWindowDimensions();
  const outerSize = Math.min(208, Math.round((width - 32) * 0.56));
  const left = calorieTarget - calories;
  const percentOf = (goal: Goal) => (goal.target > 0 ? (goal.current / goal.target) * 100 : 0);

  const messages = [
    left > 0 ? `${Math.round(left).toLocaleString()} KCAL TO GO` : "CALORIE GOAL HIT",
    protein.target - protein.current > 0 ? `${Math.round(protein.target - protein.current)} G PROTEIN TO GO` : "PROTEIN GOAL HIT",
    ...(exerciseCalories > 0 ? [`+${exerciseCalories} KCAL EARNED FROM TRAINING`] : []),
    ...(streak >= 2 ? [`${streak} DAY LOGGING STREAK`] : []),
  ];
  const [messageIndex, setMessageIndex] = useState(0);
  const messageCount = messages.length;

  useEffect(() => {
    const interval = setInterval(() => setMessageIndex((index) => (index + 1) % messageCount), 3400);
    return () => clearInterval(interval);
  }, [messageCount]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} className="items-center gap-5">
      <View className="w-full flex-row items-center justify-between">
        <View style={{ width: outerSize, height: outerSize }} className="items-center justify-center">
          <Ring outerSize={outerSize} index={0} stroke={12} percent={percentOf({ current: calories, target: calorieTarget })} color={NUTRITION_COLORS.calories} />
          <Ring outerSize={outerSize} index={1} stroke={10} percent={percentOf(protein)} color={NUTRITION_COLORS.protein} />
          <Ring outerSize={outerSize} index={2} stroke={10} percent={percentOf(carbs)} color={NUTRITION_COLORS.carbs} />
          <Ring outerSize={outerSize} index={3} stroke={10} percent={percentOf(fat)} color={NUTRITION_COLORS.fat} />
          <View className="items-center">
            <NumberFlow
              value={Math.abs(Math.round(left))}
              fontSize={26}
              color={left >= 0 ? colors.brand.white : colors.semantic.warning}
              fontWeight="800"
              style={{ transform: [{ skewX: "-8deg" }] }}
            />
            <Text className="caption font-body-semibold text-text-secondary">{left >= 0 ? "kcal left" : "kcal over"}</Text>
          </View>
        </View>

        <View className="gap-3.5">
          <LegendRow color={NUTRITION_COLORS.calories} label="EATEN" goal={{ current: calories, target: calorieTarget }} unit="kcal" />
          <LegendRow color={NUTRITION_COLORS.protein} label="PROTEIN" goal={protein} unit="g" />
          <LegendRow color={NUTRITION_COLORS.carbs} label="CARBS" goal={carbs} unit="g" />
          <LegendRow color={NUTRITION_COLORS.fat} label="FAT" goal={fat} unit="g" />
        </View>
      </View>

      <View style={{ minHeight: 26 }} className="items-center justify-center">
        <AnimatedText
          text={messages[messageIndex % messageCount]}
          animationConfig={{ characterDelay: 14 }}
          enterFrom={{ translateY: 18, scale: 0.5 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 18, letterSpacing: 1.2, color: colors.neutral.textSecondary }}
        />
      </View>
    </Animated.View>
  );
}
