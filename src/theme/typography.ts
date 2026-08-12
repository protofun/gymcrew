import { fontFamily } from "./fonts";

/**
 * Type scale for the GymCrew design system.
 * Mirrors the `heading-*` / `body-*` / `caption` utility classes
 * registered in `global.css`. Use this in JS/TS only when className
 * isn't available (e.g. inside a chart/SVG library).
 */
export const typography = {
  h1: { fontFamily: fontFamily.heading, fontSize: 64, lineHeight: 64 * 1.1, fontWeight: "700" as const },
  h2: { fontFamily: fontFamily.heading, fontSize: 40, lineHeight: 40 * 1.2, fontWeight: "700" as const },
  h3: { fontFamily: fontFamily.heading, fontSize: 28, lineHeight: 28 * 1.3, fontWeight: "700" as const },
  h4: { fontFamily: fontFamily.bodySemiBold, fontSize: 20, lineHeight: 20 * 1.4, fontWeight: "600" as const },
  bodyLarge: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 16 * 1.6, fontWeight: "500" as const },
  bodyMedium: { fontFamily: fontFamily.bodyRegular, fontSize: 14, lineHeight: 14 * 1.6, fontWeight: "400" as const },
  bodySmall: { fontFamily: fontFamily.bodyRegular, fontSize: 12, lineHeight: 12 * 1.6, fontWeight: "400" as const },
  caption: { fontFamily: fontFamily.bodyRegular, fontSize: 11, lineHeight: 11 * 1.4, fontWeight: "400" as const },
} as const;
