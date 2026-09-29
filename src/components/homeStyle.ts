import { colors, fontFamily } from "@/theme";

/**
 * One shared type scale and visual language for the whole Home page, so every row, every section header and every leading
 * icon looks like part of the same design instead of each widget inventing its own sizes and colors as it was built. Every
 * Home component should pull from here rather than writing its own inline `fontSize`/`color` numbers.
 */

/** The small label above a title — always this gray, never tinted per row, so scanning the page doesn't mean reading a
 * different color scheme every few lines. */
export const HOME_EYEBROW = {
  fontFamily: fontFamily.bodySemiBold,
  fontSize: 11,
  letterSpacing: 1.2,
  color: colors.neutral.textSecondary,
} as const;

/** A section header's eyebrow + title — Calendar, Train This Next and Your Goals all open exactly this way. */
export const HOME_SECTION_TITLE = {
  fontFamily: fontFamily.heading,
  fontSize: 28,
  lineHeight: 30,
  letterSpacing: 1,
  color: colors.brand.white,
} as const;

/** One flowing-list row's title (its name, or its headline number) — every row uses this same size, whether it's
 * "PUSH DAY", "1780", "IRON LEGION" or "GOLD". */
export const HOME_ROW_TITLE = {
  fontFamily: fontFamily.heading,
  fontSize: 24,
  lineHeight: 26,
  letterSpacing: 1,
  color: colors.brand.white,
} as const;

/** A row's secondary line — always this weight/color. */
export const HOME_ROW_DETAIL = {
  fontFamily: fontFamily.bodySemiBold,
  fontSize: 13,
  color: colors.neutral.textSecondary,
} as const;

/** The one accent color for Home's rings and highlights. Semantic colors (win/lose, a goal's own color) are the only
 * exceptions — everything else is this yellow, so the page reads as one product instead of a different tint per widget. */
export const HOME_ACCENT = colors.brand.yellow;

/** Every row's leading ring/badge is exactly this big. */
export const HOME_LEAD_SIZE = 44;
export const HOME_LEAD_STROKE = 4;

/** Home v3: flat language, no rings, no glow — a leading icon sits in a solid-filled rounded square
 * (like an app icon) instead of a circle with a progress ring around it; a bar underneath carries
 * progress instead. Used by the stat chips, Nutrition/Crew tiles and the goal chips. */
export const HOME_BADGE_SIZE = 44;
export const HOME_BADGE_RADIUS = 14;
