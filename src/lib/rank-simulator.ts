import { MAJOR_LIFT_CARDS } from "@/data/rank-lifts";
import type { LiftRankCard } from "@/lib/lift-rank-cards";
import { calculateLiftRankDetail, estimateTierPositionForWeight, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";

export type HypotheticalRankResult = { tier: RankTier; progressToNextTier: number };

/**
 * What rank a hypothetical weight on this lift would hit — the core of the "What's my rank?" tool's
 * reveal step. The 4 major lifts use the real bodyweight-ratio formula; the 5 seeded lifts fall back
 * to `estimateTierPositionForWeight` (see lib/rank.ts) since there's no strength-standard table for
 * them yet, anchored on the card's own current tier position.
 */
export function rankForHypotheticalWeight(card: LiftRankCard, weightKg: number, profile: RankProfile): HypotheticalRankResult {
  const majorLift = MAJOR_LIFT_CARDS.find((lift) => lift.id === card.id)?.majorLift ?? null;
  if (majorLift) {
    const { tier, progressToNextTier } = calculateLiftRankDetail(majorLift, weightKg, profile);
    return { tier, progressToNextTier };
  }

  const fallbackKgPerTier = Math.max(1, card.bestWeightKg * 0.06);
  const { tierIndex, progressToNextTier } = estimateTierPositionForWeight(
    RANK_TIERS.indexOf(card.tier),
    card.percentileInTier,
    card.bestWeightKg,
    card.kgToNextTier ?? fallbackKgPerTier,
    weightKg,
  );
  return { tier: RANK_TIERS[tierIndex], progressToNextTier };
}

export type SimulationPoint = {
  label: string;
  weekOffset: number;
  weightKg: number;
  tierIndex: number;
};

/** 5 points total (now + 4 evenly-spaced checkpoints) — enough to read a trend without cluttering a
 * small chart. */
const SIMULATION_STEP_COUNT = 4;

/**
 * Projects a rank tier over time on a straight-line weight path from `currentWeightKg` to
 * `goalWeightKg` — not a prediction of real progress (that depends on training, recovery, genetics),
 * just "if you got there linearly, here's what your rank would look like along the way." Takes a
 * resolver rather than a `LiftRankCard` directly so it works for any exercise, not just the 9 tracked
 * lifts (see genericExerciseRankDetail for the fallback used outside those 9).
 */
export function simulateRankProgression(
  currentWeightKg: number,
  goalWeightKg: number,
  periodWeeks: number,
  rankAtWeight: (weightKg: number) => HypotheticalRankResult,
): SimulationPoint[] {
  const points: SimulationPoint[] = [];
  for (let i = 0; i <= SIMULATION_STEP_COUNT; i++) {
    const t = i / SIMULATION_STEP_COUNT;
    const weekOffset = Math.round(periodWeeks * t);
    const weightKg = Math.round(currentWeightKg + (goalWeightKg - currentWeightKg) * t);
    const tierIndex = RANK_TIERS.indexOf(rankAtWeight(weightKg).tier);
    points.push({ label: i === 0 ? "Now" : `Wk ${weekOffset}`, weekOffset, weightKg, tierIndex });
  }
  return points;
}

/** Flat 1%/week of the current lift — e.g. 8% (~11kg on a 140kg lift) over 8 weeks, a generous,
 * explainable stand-in for a typical novice/intermediate linear-progression pace. Not lift- or
 * profile-specific on purpose: a simple, obviously-approximate rate is more trustworthy here than a
 * falsely precise model. Used to auto-estimate a timeline for a goal, not to cap one. */
export const ASSUMED_WEEKLY_GAIN_RATE = 0.01;

/**
 * How many weeks a straight-line plan at the assumed weekly gain rate would take to go from
 * `currentWeightKg` to `goalWeightKg` — the simulator's default "how long will this take?" estimate
 * (see ranks/whats-my-rank.tsx's "Auto-Estimate" timeline mode). 0 when the goal's already at or
 * below the current weight (nothing left to gain).
 */
export function weeksNeededForGoal(currentWeightKg: number, goalWeightKg: number): number {
  if (goalWeightKg <= currentWeightKg) return 0;
  const weeklyGainKg = Math.max(0.1, currentWeightKg * ASSUMED_WEEKLY_GAIN_RATE);
  return Math.max(1, Math.ceil((goalWeightKg - currentWeightKg) / weeklyGainKg));
}

/** Ceiling for the binary search below — far past any real lift, just a safe search bound. */
const WEIGHT_SEARCH_CEILING_KG = 2000;
const WEIGHT_SEARCH_ITERATIONS = 40; // gives sub-gram precision over a 0-2000kg range, plenty

/**
 * The lightest weight that reaches `targetTierIndex` — found by binary search rather than
 * inverting rank.ts's formulas directly, since tier is monotonically non-decreasing in weight
 * across every rank path this app has (the major-lift bodyweight-ratio formula, the seeded-lift
 * estimate, and the generic muscle-group proxy alike). That makes one search work for any exercise
 * without duplicating (and risking drifting from) whichever formula `rankAtWeight` resolves to.
 * Powers the simulator's "goal by rank" mode (see ranks/whats-my-rank.tsx).
 */
export function weightNeededForTier(targetTierIndex: number, rankAtWeight: (weightKg: number) => HypotheticalRankResult): number {
  let lo = 0;
  let hi = WEIGHT_SEARCH_CEILING_KG;
  // Even the ceiling doesn't reach it (e.g. an exotic proxy formula) — cap there rather than loop
  // toward a misleadingly precise but meaningless number.
  if (RANK_TIERS.indexOf(rankAtWeight(hi).tier) < targetTierIndex) return hi;
  for (let i = 0; i < WEIGHT_SEARCH_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (RANK_TIERS.indexOf(rankAtWeight(mid).tier) >= targetTierIndex) hi = mid;
    else lo = mid;
  }
  return Math.round(hi);
}
