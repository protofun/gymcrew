import type { ReactNode } from "react";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";

import { colors } from "@/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A half-circle speedometer gauge — open at the bottom, not a closed ring — for a single percentage.
 * "ik wil van die ringen af... kijk naar radial charts" applied to the one other full `CircularProgress`
 * ring prominent enough to read as the same complaint as Home's (Crew's own division hero). An open arc
 * is a real, different device from a closed ring (no full circular stroke anywhere), not a cosmetic trim
 * of the same shape — the same plain-SVG + `useAnimatedProps` mechanism `RadarChart`/`DonutChart` already
 * use, just drawn along a half-circle `Path` instead of a full `Circle`. */
export function GaugeArc({ fraction, size = 160, strokeWidth = 12, color = colors.brand.yellow, children }: { fraction: number; size?: number; strokeWidth?: number; color?: string; children?: ReactNode }) {
  const radius = size / 2 - strokeWidth / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLength = Math.PI * radius;
  const d = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, fraction)), { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [fraction, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size / 2 + strokeWidth }}>
      <Svg width={size} height={size / 2 + strokeWidth}>
        <Path d={d} stroke={colors.neutral.divider} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
        <AnimatedPath d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={`${arcLength} ${arcLength}`} animatedProps={animatedProps} />
      </Svg>
      {children && (
        <View style={{ position: "absolute", left: 0, right: 0, top: size * 0.22, alignItems: "center" }}>{children}</View>
      )}
    </View>
  );
}
