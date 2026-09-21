import { colors } from "@/theme";

/** The look of the AI meal-scan flow (camera → analysing → results). Screens use the app's own
 * surface colors so the flow sits in the app like everything else; the "AI" feel comes from the
 * accent, the glow and the motion. */
export const AI_SCAN = {
  /** Siri-style glow around the photo while it's being analysed. */
  glow: ["#E3FF00", "#00E5FF", "#8B5CF6", "#FF4FD8", "#E3FF00"],
  surface: colors.neutral.surface,
  surfaceRaised: colors.neutral.surfaceElevated,
  border: colors.neutral.divider,
  textMuted: colors.neutral.textSecondary,
  accent: colors.brand.yellow,
  onAccent: colors.brand.iron,
  /** Controls drawn over the live camera or the photo — translucent, since the picture is behind them. */
  overlay: "rgba(0,0,0,0.5)",
  overlayBorder: "rgba(255,255,255,0.18)",
  textOnMedia: "rgba(255,255,255,0.75)",
} as const;

/** Colors for the Reacticx SaveButton, in the GymCrew accent instead of its default beige. */
export const AI_SAVE_BUTTON_COLORS = {
  lightBg: colors.brand.yellow,
  darkBg: "#20260A",
  border: colors.brand.yellow,
  label: colors.brand.iron,
  savedLabel: colors.brand.yellow,
  spinnerTrack: "rgba(227,255,0,0.25)",
  spinnerHead: colors.brand.yellow,
  successBadge: colors.brand.yellow,
  successCheck: colors.brand.iron,
  doneCheckBg: colors.brand.yellow,
  doneCheckMark: colors.brand.iron,
} as const;

/** Theme for the Reacticx Accordion that lists the ingredients — the app's own card colors. */
export const AI_ACCORDION_THEME = {
  backgroundColor: colors.neutral.surface,
  borderColor: colors.neutral.divider,
  headlineColor: colors.brand.white,
  subtitleColor: colors.neutral.textSecondary,
  iconColor: colors.neutral.textSecondary,
} as const;
