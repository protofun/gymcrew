import { LinearGradient } from "expo-linear-gradient";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { AI_SCAN } from "@/constants/ai-scan-theme";

/** Web version of AiBeamFrame — a gradient border that slowly breathes, instead of the Skia beam that
 * runs around the edge. Same contract: the child draws its own background with the same radius. */
export function AiBeamFrame({ children, borderRadius = 24 }: { children: ReactNode; borderRadius?: number }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse]);

  const borderStyle = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.5 }));

  return (
    <View style={{ borderRadius, overflow: "hidden" }}>
      <Animated.View style={[StyleSheet.absoluteFill, borderStyle]}>
        <LinearGradient colors={[...AI_SCAN.glow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={{ margin: 1.5, borderRadius: borderRadius - 1.5, overflow: "hidden" }}>{children}</View>
    </View>
  );
}
