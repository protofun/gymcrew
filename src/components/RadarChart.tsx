import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Line, Polygon, Svg } from "react-native-svg";

import { colors, fontFamily } from "@/theme";

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

export type RadarAxisDatum = { label: string; value: number; target: number };

function axisAngle(index: number, count: number) {
  return (index / count) * Math.PI * 2 - Math.PI / 2;
}

function polarPoint(center: number, radius: number, angle: number) {
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

function polygonPoints(axes: { fraction: number }[], center: number, maxRadius: number, scale: number) {
  return axes
    .map((axis, index) => {
      const point = polarPoint(center, maxRadius * axis.fraction * scale, axisAngle(index, axes.length));
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

/** A real spider/radar chart — plain `react-native-svg` polygons, not the vendored Reacticx `radar-chart`
 * (which pulls `@shopify/react-native-skia` straight in, same as `bar-chart`/`line-chart`, and would need
 * its own `.web.tsx` twin to ship on this app's web/PWA build — the same tradeoff `DonutChart`/`ActivityRings`
 * already made in earlier rounds). "ik wil van die ringen af... kijk naar radar charts of radial charts" —
 * a filled polygon across several independent axes is genuinely not a ring in any sense: no closed circular
 * stroke anywhere on this component, a completely different shape language. Reuses the same
 * `Animated.createAnimatedComponent` + `useAnimatedProps` mechanism every other animated SVG shape in this
 * app already uses (ultimately traced back to the vendored `check-box` organism), just animating a polygon's
 * `points` string growing outward from the center instead of a circle's stroke-dash. */
export function RadarChart({ axes, size = 240 }: { axes: RadarAxisDatum[]; size?: number }) {
  const center = size / 2;
  const maxRadius = center - 40;
  const scale = useSharedValue(0);

  const fractions = axes.map((axis) => ({ fraction: axis.target > 0 ? Math.min(1, axis.value / axis.target) : 0 }));

  useEffect(() => {
    scale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [scale, axes.length]);

  const animatedProps = useAnimatedProps(() => ({
    points: polygonPoints(fractions, center, maxRadius, scale.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {GRID_LEVELS.map((level) => (
          <Polygon key={level} points={polygonPoints(fractions.map(() => ({ fraction: 1 })), center, maxRadius, level)} fill="none" stroke={colors.neutral.divider} strokeWidth={1} />
        ))}
        {axes.map((_, index) => {
          const point = polarPoint(center, maxRadius, axisAngle(index, axes.length));
          return <Line key={axes[index].label} x1={center} y1={center} x2={point.x} y2={point.y} stroke={colors.neutral.divider} strokeWidth={1} />;
        })}
        <AnimatedPolygon animatedProps={animatedProps} fill={`${colors.brand.yellow}33`} stroke={colors.brand.yellow} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
      {axes.map((axis, index) => {
        const point = polarPoint(center, maxRadius + 24, axisAngle(index, axes.length));
        return (
          <View key={axis.label} style={{ position: "absolute", left: point.x - 34, top: point.y - 13, width: 68 }} className="items-center">
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 10, color: colors.neutral.textSecondary, letterSpacing: 0.4 }} numberOfLines={1}>
              {axis.label}
            </Text>
            <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.brand.white }}>{`${Math.round(axis.value)}/${axis.target}`}</Text>
          </View>
        );
      })}
    </View>
  );
}
