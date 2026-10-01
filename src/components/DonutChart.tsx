import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Circle, Svg } from "react-native-svg";

import { colors, fontFamily } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type DonutSegment = { label: string; value: number; color: string };

type SliceProps = {
  color: string;
  startFraction: number;
  endFraction: number;
  radius: number;
  circumference: number;
  strokeWidth: number;
  center: number;
  progress: ReturnType<typeof useSharedValue<number>>;
};

function DonutSlice({ color, startFraction, endFraction, radius, circumference, strokeWidth, center, progress }: SliceProps) {
  const animatedProps = useAnimatedProps(() => {
    const sweep = (endFraction - startFraction) * progress.value;
    const dash = Math.max(0, sweep * circumference - 1.5); // small gap between slices
    return {
      strokeDasharray: `${dash} ${circumference - dash}`,
      strokeDashoffset: -startFraction * circumference,
    };
  });

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="transparent"
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

/** A real multi-color pie/donut — built on plain `react-native-svg` stacked arcs (the same
 * `Animated.createAnimatedComponent` + `strokeDasharray`/`strokeDashoffset` technique the vendored
 * `check-box` organism already uses), not the single-fill `CircularProgress` ring every other Crew
 * screen leans on, and not Skia (`ui/charts/pie-chart`, native-only — this app ships web too, same
 * reasoning `DiaryWeekChart`/`TrendChart` already document for staying off Skia for a cross-platform
 * chart). Genuinely different visual language for proportion-of-whole data, not a third invented way
 * to draw a single percentage — see `SegmentedProportionBar` for the flat-bar alternative this
 * complements rather than replaces. */
export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 20,
  centerLabel,
  centerSublabel,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, total]);

  let cursor = 0;
  const slices = segments.map((segment) => {
    const fraction = total > 0 ? segment.value / total : 0;
    const startFraction = cursor;
    cursor += fraction;
    return { ...segment, startFraction, endFraction: cursor };
  });

  return (
    <View className="flex-row items-center gap-5">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={center} cy={center} r={radius} stroke={colors.neutral.divider} strokeWidth={strokeWidth} fill="transparent" />
          {slices.map((slice) => (
            <DonutSlice
              key={slice.label}
              color={slice.color}
              startFraction={slice.startFraction}
              endFraction={slice.endFraction}
              radius={radius}
              circumference={circumference}
              strokeWidth={strokeWidth}
              center={center}
              progress={progress}
            />
          ))}
        </Svg>
        {(centerLabel || centerSublabel) && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} className="items-center justify-center">
            {centerLabel && <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, color: colors.brand.white }}>{centerLabel}</Text>}
            {centerSublabel && <Text className="caption text-text-secondary">{centerSublabel}</Text>}
          </View>
        )}
      </View>

      <View className="flex-1 gap-1.5">
        {segments.map((segment) => {
          const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <View key={segment.label} className="flex-row items-center gap-1.5">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: segment.color }} />
              <Text className="caption flex-1 text-text-secondary" numberOfLines={1}>
                {segment.label}
              </Text>
              <Text className="caption font-body-bold text-text-primary">{`${percent}%`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
