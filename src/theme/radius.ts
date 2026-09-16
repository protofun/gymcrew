/**
 * Corner-radius scale for the GymCrew design system.
 *
 * Values are the app's *actual* existing convention, not an invented scale — counted from real
 * `rounded-*` usage across `src/app` and `src/components` (336× `rounded-full`, 225× `rounded-2xl`,
 * 109× `rounded-xl`, 32× `rounded-3xl`; `rounded-lg`/`rounded-md`/`rounded-sm` appear only a
 * handful of times combined and are not part of the real convention). GymCrew's cards and sheets
 * read noticeably rounder than a typical `rounded-lg` app — preserve that when re-skinning onto
 * Reacticx, which defaults many of its own components to tighter radii.
 *
 * Prefer the matching NativeWind class (`rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`)
 * for everyday styling; use this object only where a raw number is required (e.g. an animated
 * radius, or a prop a Reacticx component expects as a number rather than a class).
 */
export const radius = {
  /** `rounded-xl` — small controls: chips, tags, input fields. */
  small: 12,
  /** `rounded-2xl` — the dominant card/sheet/button radius across the app. */
  medium: 16,
  /** `rounded-3xl` — hero cards, large modals, feature banners. */
  large: 24,
  /** `rounded-full` on a pill-shaped (wide) element: segmented controls, stat pills, badges. */
  pill: 9999,
  /** `rounded-full` on a 1:1 aspect element: avatars, icon buttons, FABs. Same value as `pill` —
   * kept as a separate name because the two express different intent at the call site. */
  circular: 9999,
} as const;
