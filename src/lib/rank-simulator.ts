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
 * profile-specific on purpose: a simple, obviously-approximate ceiling is more trustworthy here than
 * a falsely precise model. Matches the wizard's own default goal suggestion (+8% of current), so a
 * freshly-opened simulator never flags its own starting default as unrealistic. */
export const MAX_REALISTIC_WEEKLY_GAIN_RATE = 0.01;

/** The heaviest goal weight a straight-line plan can realistically reach in `periodWeeks`. */
export function maxRealisticGoalKg(currentWeightKg: number, periodWeeks: number): number {
  return Math.round(currentWeightKg * (1 + MAX_REALISTIC_WEEKLY_GAIN_RATE * periodWeeks));
}
