import { useEffect } from "react";
import { View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors } from "@/theme";

const INACTIVE_WIDTH = 8;
const ACTIVE_WIDTH = 24;

function Dot({ active }: { active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 12, mass: 0.5 });
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    width: INACTIVE_WIDTH + progress.value * (ACTIVE_WIDTH - INACTIVE_WIDTH),
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
  }));

  return <Animated.View style={[{ height: INACTIVE_WIDTH, borderRadius: 999 }, style]} />;
}

type OnboardingDotsProps = {
  count: number;
  activeIndex: number;
};

export function OnboardingDots({ count, activeIndex }: OnboardingDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} active={index === activeIndex} />
      ))}
    </View>
  );
}
