/**
 * Motion presets for the GymCrew design system.
 *
 * Reacticx is built around Reanimated/Gesture Handler motion, so per AGENTS.md §17 this treats
 * motion as a first-class part of the design system rather than leaving it to each screen. Every
 * value below is the app's own *existing*, already-dominant convention — counted from real
 * `damping()/mass()` and `withTiming(..., { duration })` calls across `src/app` + `src/components`
 * — not a new animation language invented for the migration:
 *
 * - `damping(16).mass(0.6)` — 79 call sites, by far the most common. This is GymCrew's default
 *   entrance feel and is now `spring.entrance`.
 * - `damping(14).mass(0.6)` — 45 call sites, the next most common (onboarding footers, sheet
 *   opens) — a touch snappier/bouncier. Now `spring.entranceBouncy`.
 * - `damping(16).mass(0.7)` — 13 sites, a heavier/slower variant for bigger elements. Now
 *   `spring.heavy`.
 * - `damping(11).mass(0.7)` — 8 sites, used for tap/press micro-interactions (`Stepper`,
 *   `SliderField`, `TabBarFab`'s twist-and-pop). Now `spring.press`.
 *
 * A handful of one-off combinations exist elsewhere (`damping(18).mass(0.7)`,
 * `damping(9).mass(0.8)`, etc.) — those were bespoke to one flagship animation (e.g.
 * `BadgeRevealFx`'s reveal choreography) and are deliberately NOT generalized here; leave them as
 * local constants in those files rather than forcing them into this shared scale.
 */
export const spring = {
  /** GymCrew's default entrance spring — `FadeInUp.springify().damping(16).mass(0.6)` etc. */
  entrance: { damping: 16, mass: 0.6 },
  /** Slightly snappier/bouncier — onboarding footers, sheet/modal opens. */
  entranceBouncy: { damping: 14, mass: 0.6 },
  /** Heavier, slower — large elements (hero cards, big illustrations). */
  heavy: { damping: 16, mass: 0.7 },
  /** Tap/press micro-interactions — button pops, stepper increments. */
  press: { damping: 11, mass: 0.7 },
} as const;

/**
 * Staggered-entrance timing (the `FadeInUp.delay(n)` pattern used throughout onboarding,
 * build-crew, workout-split, and ranks screens to bring sections in one after another).
 * Real delays in the app run from ~80ms up to ~350ms across a screen's sections before flattening
 * out (longer screens don't keep stretching the stagger indefinitely) — `staggerDelay` reproduces
 * that capped-linear pattern instead of every screen hand-picking its own delay ladder.
 */
export function staggerDelay(index: number, { base = 80, step = 70, max = 320 }: { base?: number; step?: number; max?: number } = {}) {
  return Math.min(base + index * step, max);
}

/**
 * `withTiming` duration buckets. Real durations cluster into roughly four bands: quick UI
 * feedback (~150-260ms), a standard transition band (~650-750ms, e.g. sheet/modal content
 * fades), and a slow band (~1400ms) reserved for deliberately dramatic moments (e.g. the
 * workout-split "generating your plan" delay). Most new code should only need `quick`/`standard`.
 */
export const duration = {
  quick: 200,
  standard: 700,
  slow: 1400,
} as const;
