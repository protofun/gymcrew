import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors, fontFamily, spring } from "@/theme";

function Pill<T extends string>({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void; value: T }) {
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    // `spring.press` (damping 11, mass 0.7) is intentionally underdamped for its usual tap-pop use —
    // plain, it doesn't just ease up to 0/1, it RINGS past the target and bounces back several times
    // before settling. That's a fine feel for a scale bump, but here it also drives the background/
    // border color every one of those frames, so the deselecting pill visibly pulsed bright-dim-bright
    // several times before settling — the actual "flikkert" (measured directly: its background color
    // cycled through ~4 distinct brightness levels over ~300ms after a tap, not a smooth one-way fade).
    // `overshootClamping: true` keeps the same spring accel/decel curve but stops it dead the instant it
    // reaches the target — no ring, no bounce, so the color eases monotonically instead of pulsing.
    on.value = withSpring(selected ? 1 : 0, { ...spring.press, overshootClamping: true });
  }, [selected, on]);

  const style = useAnimatedStyle(() => {
    // Defensive clamp — `overshootClamping` above should already keep `on.value` inside [0, 1], but
    // `interpolateColor` doesn't clamp its own input, and any out-of-range value would extrapolate into
    // a visibly wrong color rather than just looking slightly off.
    const t = Math.min(Math.max(on.value, 0), 1);
    return {
      backgroundColor: interpolateColor(t, [0, 1], [colors.neutral.surface, colors.brand.yellow]),
      borderColor: interpolateColor(t, [0, 1], [colors.neutral.divider, colors.brand.yellow]),
      transform: [{ scale: 1 + t * 0.04 }],
    };
  });

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[{ height: 40, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16 }, style]} className="items-center justify-center">
        <Text style={{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: selected ? colors.brand.iron : colors.neutral.textSecondary }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

type PillRowProps<T extends string> = {
  options: readonly { key: T; label: string }[];
  /** `null` when nothing is picked yet (a preset row before any preset is chosen). */
  value: T | null;
  onChange: (value: T) => void;
  /** How far the row bleeds to the screen edge, so it scrolls under the page's side padding. */
  bleed?: number;
  /** Lay the pills out over as many lines as they need instead of one line you slide through — better when they should all be in view. */
  wrap?: boolean;
};

/** A row of pills you slide through — the picked one fills yellow with a spring. Unlike a chip that only shows its label once selected,
 * every pill always says what it is. */
export function PillRow<T extends string>({ options, value, onChange, bleed = 16, wrap = false }: PillRowProps<T>) {
  if (wrap) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pill key={option.key} value={option.key} label={option.label} selected={option.key === value} onPress={() => onChange(option.key)} />
        ))}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -bleed }} contentContainerStyle={{ paddingHorizontal: bleed, gap: 8 }}>
      {options.map((option) => (
        <Pill key={option.key} value={option.key} label={option.label} selected={option.key === value} onPress={() => onChange(option.key)} />
      ))}
    </ScrollView>
  );
}

type MultiPillRowProps<T extends string> = {
  options: readonly { key: T; label: string }[];
  /** Every currently-picked value — unlike `PillRow`, more than one pill can be active at once. */
  values: T[];
  onToggle: (value: T) => void;
  bleed?: number;
  wrap?: boolean;
};

/** The multi-select sibling of `PillRow` — same `Pill` visual (spring fill, same colors), but any
 * number of pills can be on at once instead of exactly one. For filter rows (equipment, muscle
 * group) where picking "Barbell" and "Dumbbell" together should narrow, not replace. */
export function MultiPillRow<T extends string>({ options, values, onToggle, bleed = 16, wrap = false }: MultiPillRowProps<T>) {
  const pills = options.map((option) => (
    <Pill key={option.key} value={option.key} label={option.label} selected={values.includes(option.key)} onPress={() => onToggle(option.key)} />
  ));

  if (wrap) {
    return <View className="flex-row flex-wrap gap-2">{pills}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -bleed }} contentContainerStyle={{ paddingHorizontal: bleed, gap: 8 }}>
      {pills}
    </ScrollView>
  );
}
