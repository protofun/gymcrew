import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

/** "#RRGGBB" → "rgba(r, g, b, a)". */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type GradientBorderProps = {
  /** "beam": a light running round a dim edge — `colors` are [the beam, its hot core]. "ring": a full circle of color shifting round — `colors` are all of it. */
  mode: "beam" | "ring";
  colors: [string, string, ...string[]];
  borderRadius: number;
  borderWidth?: number;
  /** Milliseconds for one full turn. */
  duration?: number;
  children: ReactNode;
};

/** A border made of light that moves round whatever it wraps. A big gradient square turns slowly behind the child, which sits inset by the border's
 * width on top of it, so only a thin edge of the gradient shows. Plain gradient + Reanimated — no Skia canvas, so nothing here blanks or flickers
 * when a screen is switched away from. The child has to draw its own background, with `borderRadius - borderWidth`. */
export function GradientBorder({ mode, colors, borderRadius, borderWidth = 2, duration = 5000, children }: GradientBorderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
  }, [duration, turn]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  const diagonal = Math.ceil(Math.hypot(size.width, size.height));
  const gradient: [string, string, ...string[]] =
    mode === "beam" ? [colors[1], colors[0], withAlpha(colors[0], 0.22), withAlpha(colors[0], 0.22), withAlpha(colors[0], 0.22)] : [...colors, colors[0]];
  const locations = mode === "beam" ? ([0, 0.14, 0.32, 0.7, 1] as const) : undefined;

  return (
    <View style={{ borderRadius, overflow: "hidden" }} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {diagonal > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: (size.width - diagonal) / 2, top: (size.height - diagonal) / 2, width: diagonal, height: diagonal }, spinStyle]}>
          <LinearGradient colors={gradient} locations={locations as never} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
        </Animated.View>
      )}
      <View style={{ margin: borderWidth, borderRadius: Math.max(0, borderRadius - borderWidth), overflow: "hidden" }}>{children}</View>
    </View>
  );
}
