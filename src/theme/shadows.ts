import { Platform } from "react-native";

/**
 * Shadow presets for the GymCrew design system.
 *
 * Per CLAUDE.md's styling-exception list, shadows are one of the few things GymCrew intentionally
 * keeps out of NativeWind ("different per platform") — every existing shadow in the app is a raw
 * `StyleSheet`/inline object. This file does not change that pattern, it just gives the ~6
 * independently-hand-written shadow objects found across `TabBarFab`, `AppToast`,
 * `profile/workout-split.tsx`, `crew.tsx`, `SegmentedBar`, and `AppTourOverlay` a shared, named
 * scale instead of each screen re-deriving its own numbers. All existing values clustered around
 * opacity 0.25-0.35 / radius 10-12 / elevation 6-8 — `medium` below matches that cluster exactly;
 * `small` and `large` extrapolate one step down/up the same curve for places that need a lighter
 * or heavier lift than the existing convention already covers.
 *
 * Always black-based (`#000`) regardless of the element's own color, matching every existing
 * example — this is a dark app, so shadows read as depth/elevation cues, not colored glows.
 */
function shadow(opacity: number, radius: number, offsetY: number, elevation: number) {
  return Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    default: { elevation },
  });
}

export const shadows = {
  /** Subtle lift for list rows, small chips, inline controls. */
  small: shadow(0.2, 6, 2, 3),
  /** The app's dominant card/sheet/FAB shadow — matches the existing convention exactly. */
  medium: shadow(0.3, 11, 4, 7),
  /** Hero cards, modals, anything meant to visually float above everything else. */
  large: shadow(0.4, 16, 8, 12),
} as const;
