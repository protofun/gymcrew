/**
 * Color tokens for the GymCrew design system.
 * Mirrors the CSS variables registered in `global.css`.
 * Use this in JS/TS whenever a hex value is needed directly
 * (e.g. StyleSheet exceptions like shadows, status bar, SVG fills).
 * For everyday styling, prefer the NativeWind classes (bg-*, text-*, border-*).
 */
export const colors = {
  brand: {
    yellow: "#E3FF00",
    green: "#00C853",
    white: "#FFFFFF",
    iron: "#1F2328",
  },
  semantic: {
    success: "#00C853",
    warning: "#FFB800",
    streak: "#FF6D00",
    error: "#FF3B30",
    info: "#2979FF",
  },
  neutral: {
    textPrimary: "#EDEFF2",
    textSecondary: "#8B929E",
    /**
     * No screen used a second, lighter surface tone before this — every card sits directly on
     * `surface`. Added for the Reacticx migration's design system (AGENTS.md §17 wants a
     * `surfaceElevated` tier): `surface` lightened 8% toward white via `lib/color.ts`'s
     * `lighten()` (same helper already used for rank/division gradient tinting), then inlined
     * as a literal hex here to match every other token in this file.
     */
    surfaceElevated: "#292C32",
    divider: "#2C3138",
    surface: "#161A20",
    background: "#0D1117",
  },
} as const;
