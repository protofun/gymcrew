import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { colors } from "@/theme";

type SkeletonProps = {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  className?: string;
};

/** A pulsing placeholder block for content that's still loading — pair a few of these to sketch
 * the shape of the real layout underneath (see `HomeSkeleton` for an example) instead of leaving a
 * blank screen or a single centered spinner. */
export function Skeleton({ width, height, radius = 8, className }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={className}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.neutral.divider }, style]}
    />
  );
}
