/**
 * Spacing scale for the GymCrew design system.
 *
 * GymCrew styles almost everything with NativeWind (`p-4`, `gap-3`, `-mx-2`, etc.), which already
 * runs on Tailwind's default 4px-increment scale — that IS this app's spacing system today, and
 * this file does not replace it. Prefer the className scale for everyday layout.
 *
 * Use this object only in the same JS/TS-required situations the styling-exception list in
 * CLAUDE.md carves out for other tokens (Animated.View, dynamic runtime layout math, SVG
 * coordinates) where a raw number is needed instead of a className.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;
