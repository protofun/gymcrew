import type { LiftCardId } from "@/data/rank-lifts";
import type { RankProfile } from "@/lib/rank";

/**
 * A generous bodyweight-ratio ceiling per lift — deliberately well above real elite/world-record
 * ratios (e.g. raw deadlift world records sit around 4.5x bodyweight) so a genuinely strong lifter
 * is never blocked, while an obviously fabricated entry (typing 400kg on a bench press) is caught.
 * Flat per lift rather than gender/age-adjusted — `calculateLiftRankDetail`'s own ratio bounds
 * already do the fair, precise normalization for ranking; this is just a blunt sanity ceiling.
 */
const MAX_BODYWEIGHT_RATIO: Record<LiftCardId, number> = {
  benchPress: 3.0,
  squat: 4.2,
  deadlift: 4.7,
  overheadPress: 2.2,
  pullUp: 2.5,
  seatedRow: 3.0,
  inclinePress: 2.6,
  legPress: 8.0,
  lunge: 2.5,
};

/** Ceiling for any exercise outside the 9 tracked lifts (no per-lift ratio tuned for it) — pitched
 * around raw deadlift world-record territory so it stays generous across very different lift types. */
const DEFAULT_MAX_BODYWEIGHT_RATIO = 4.5;

/** No single free-weight lift is realistic above this, regardless of bodyweight — guards against a
 * very low bodyweight (e.g. an incomplete profile) producing a tiny, easily-triggered ratio ceiling. */
const ABSOLUTE_MAX_KG = 500;
const MAX_PLAUSIBLE_REPS = 30;

export type PlausibilityResult = { isPlausible: true } | { isPlausible: false; reason: string };

/**
 * A lightweight anti-cheat check for the "What's my rank?" tool's "Log as PR" action — logging a
 * hypothetical set for personal exploration is fine either way, but a set that actually counts
 * toward rank/XP/crew points needs to be at least physically plausible for the user's own profile.
 */
export function checkLiftPlausibility(liftId: string, weightKg: number, reps: number, profile: RankProfile): PlausibilityResult {
  if (!Number.isFinite(weightKg) || weightKg < 0) return { isPlausible: false, reason: "Enter a weight of 0 or more." };
  if (!Number.isFinite(reps) || reps <= 0) return { isPlausible: false, reason: "Enter at least 1 rep." };
  // The rep cap exists so a high-rep set doesn't distort a 1RM estimate on a *weighted* lift — it
  // doesn't apply at 0kg (bodyweight exercises like crunches are ranked by reps on purpose).
  if (weightKg > 0 && reps > MAX_PLAUSIBLE_REPS) {
    return { isPlausible: false, reason: `${MAX_PLAUSIBLE_REPS}+ reps isn't reliable for a 1RM-based rank — log a heavier, lower-rep set.` };
  }
  if (weightKg > ABSOLUTE_MAX_KG) {
    return { isPlausible: false, reason: `${ABSOLUTE_MAX_KG}kg on a single lift isn't realistic — double check the number.` };
  }

  const ratio = weightKg / profile.bodyWeightKg;
  const maxRatio = (MAX_BODYWEIGHT_RATIO as Record<string, number>)[liftId] ?? DEFAULT_MAX_BODYWEIGHT_RATIO;
  if (ratio > maxRatio) {
    return {
      isPlausible: false,
      reason: `That's ${ratio.toFixed(1)}× your bodyweight — beyond anything realistic for this lift. Double check the weight and your profile.`,
    };
  }

  return { isPlausible: true };
}
