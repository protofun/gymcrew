import type { ImageSourcePropType } from "react-native";

import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import { calculateLiftRankDetail, estimateTierPositionForWeight, RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import type { PersonalRecord } from "@/store/personal-records-store";

export type RankScope = "gym" | "worldwide";

export type LiftRankCard = {
  id: LiftCardId;
  name: string;
  image: ImageSourcePropType;
  /** Exercise-library id — same one personal-records-store keys PRs by, so a wizard/log flow can
   * call `checkAndRecord(card.exerciseId, ...)` directly for any of the 9 tracked lifts. */
  exerciseId: string;
  tier: RankTier;
  score: number;
  /** Position within the current tier, 0-1 — drives both the "progress to next tier" bar and the
   * displayed percentile. */
  percentileInTier: number;
  /** Where you'd stand in a small local pool — only meaningful for the "gym" scope, but always
   * computed (see `gymStandingForCard`) so switching scope doesn't need a recompute. */
  gymRank: number;
  gymPoolSize: number;
  prDeltaKg: number;
  isWeakPoint: boolean;
  bestWeightKg: number;
  bestReps: number;
  /** Extra kg needed to reach the next tier, or `null` at the top tier (Legend). */
  kgToNextTier: number | null;
};

/** A "power score" per lift, scaled so it lands in roughly the same range as the leaderboard's
 * overall player power (see data/player-leaderboard.ts) — bodyweight ratio × a flat multiplier.
 * Exported so custom (non-tracked) lifts added to the Ranks overview score on the same scale. */
export const SCORE_PER_BODYWEIGHT_RATIO = 4000;

/**
 * Placeholder until real gym-population data exists. A single gym is a much smaller, shallower pool
 * than the whole world — the same lifter naturally lands in a friendlier percentile locally than
 * globally, and that gap should actually read as different on screen, not just nudge a number by a
 * few points. Tier-scaled: the gap between "best in a 30-person gym" and "top X% of the planet"
 * widens as the tier climbs, since the global elite tail thins out far more slowly than a single
 * gym's does.
 */
const GYM_PERCENTILE_BOOST_BASE = 0.3;
const GYM_PERCENTILE_BOOST_PER_TIER = 0.015;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** A deterministic, illustrative "your gym" pool per lift — sized like a real single gym (not the
 * whole worldwide population), so a gym-scope rank position feels like a genuinely different stat
 * from a worldwide percentile, not just the same number reframed. Exported so crew-lift-compare.ts
 * can fill in the same fields for other members' cards. */
export function gymStandingForCard(liftId: string, tierIndex: number, progressToNextTier: number): { gymRank: number; gymPoolSize: number } {
  const gymPoolSize = 18 + (hashString(`${liftId}-gym-pool`) % 43); // 18-60 lifters, like one real gym
  const standing = (tierIndex + progressToNextTier) / RANK_TIERS.length;
  const jitter = ((hashString(`${liftId}-gym-rank`) % 21) - 10) / 100; // ±10%, so equal tiers don't always tie
  const percentile = Math.min(0.98, Math.max(0.02, standing + jitter));
  const gymRank = Math.min(gymPoolSize, Math.max(1, Math.round((1 - percentile) * gymPoolSize) + 1));
  return { gymRank, gymPoolSize };
}

/** A lift counts as a weak point (Weak Point Engine, v0) when it lags at least 4 tiers behind the
 * user's median lift — a simple, explainable rule rather than a fixed "always flag the lowest one",
 * so a well-rounded lifter with everything close together never gets a false flag. */
const WEAK_POINT_TIER_GAP = 4;

export function buildLiftRankCards(records: Record<string, PersonalRecord>, profile: RankProfile, scope: RankScope): LiftRankCard[] {
  const computed = MAJOR_LIFT_CARDS.map((lift) => {
    const record = records[lift.exerciseId];
    const weightKg = record?.bestWeightKg ?? 0;
    const { tier, progressToNextTier, kgToNextTier } = calculateLiftRankDetail(lift.majorLift, weightKg, profile);
    const score = Math.round((weightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    return {
      id: lift.id,
      name: lift.name,
      image: lift.image,
      exerciseId: lift.exerciseId,
      tier,
      score,
      progressToNextTier,
      prDeltaKg: lift.prDeltaKg,
      bestWeightKg: weightKg,
      bestReps: record?.bestReps ?? 0,
      kgToNextTier,
    };
  });

  // A logged PR always wins over the static seed once one exists — see estimateTierPositionForWeight
  // in lib/rank.ts (there's no real strength-standard table for these 5 lifts yet, so this is an
  // approximation anchored on the seed's own tier position, not a precise bodyweight-ratio formula).
  const seeded = SEEDED_LIFT_CARDS.map((lift) => {
    const record = records[lift.exerciseId];
    if (!record) {
      return {
        id: lift.id,
        name: lift.name,
        image: lift.image,
        exerciseId: lift.exerciseId,
        tier: lift.tier,
        score: lift.score,
        progressToNextTier: lift.progressToNextTier,
        prDeltaKg: lift.prDeltaKg,
        bestWeightKg: lift.bestWeightKg,
        bestReps: lift.bestReps,
        kgToNextTier: lift.kgToNextTier as number | null,
      };
    }

    const seedTierIndex = RANK_TIERS.indexOf(lift.tier);
    const kgPerTier = lift.kgToNextTier > 0 ? lift.kgToNextTier / Math.max(0.05, 1 - lift.progressToNextTier) : Math.max(1, lift.bestWeightKg * 0.06);
    const { tierIndex, progressToNextTier } = estimateTierPositionForWeight(
      seedTierIndex,
      lift.progressToNextTier,
      lift.bestWeightKg,
      lift.kgToNextTier,
      record.bestWeightKg,
    );
    const tier = RANK_TIERS[tierIndex];
    const score = Math.round((record.bestWeightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    const kgToNextTier = tierIndex === RANK_TIERS.length - 1 ? null : Math.round((1 - progressToNextTier) * kgPerTier);

    return {
      id: lift.id,
      name: lift.name,
      image: lift.image,
      exerciseId: lift.exerciseId,
      tier,
      score,
      progressToNextTier,
      prDeltaKg: lift.prDeltaKg,
      bestWeightKg: record.bestWeightKg,
      bestReps: record.bestReps,
      kgToNextTier,
    };
  });

  const all = [...computed, ...seeded];
  const sortedTierIndices = all.map((card) => RANK_TIERS.indexOf(card.tier)).sort((a, b) => a - b);
  const medianTierIndex = sortedTierIndices[Math.floor(sortedTierIndices.length / 2)];

  return all.map((card) => {
    const tierIndex = RANK_TIERS.indexOf(card.tier);
    const { percentileInTier, gymRank, gymPoolSize } = applyRankScope(card.id, tierIndex, card.progressToNextTier, scope);

    return {
      id: card.id,
      name: card.name,
      image: card.image,
      exerciseId: card.exerciseId,
      tier: card.tier,
      score: card.score,
      percentileInTier,
      gymRank,
      gymPoolSize,
      prDeltaKg: card.prDeltaKg,
      isWeakPoint: medianTierIndex - tierIndex >= WEAK_POINT_TIER_GAP,
      bestWeightKg: card.bestWeightKg,
      bestReps: card.bestReps,
      kgToNextTier: card.kgToNextTier,
    };
  });
}

/** Scope-adjusts one lift's percentile (see `GYM_PERCENTILE_BOOST_BASE` above) and computes its gym
 * standing — exported so a custom (non-tracked) exercise added to the Ranks overview can go through
 * the exact same scope math as the 9 built-in lifts. */
export function applyRankScope(
  liftId: string,
  tierIndex: number,
  rawProgressToNextTier: number,
  scope: RankScope,
): { percentileInTier: number; gymRank: number; gymPoolSize: number } {
  const percentileBoost = scope === "gym" ? GYM_PERCENTILE_BOOST_BASE + tierIndex * GYM_PERCENTILE_BOOST_PER_TIER : 0;
  const { gymRank, gymPoolSize } = gymStandingForCard(liftId, tierIndex, rawProgressToNextTier);
  return { percentileInTier: Math.min(0.99, rawProgressToNextTier + percentileBoost), gymRank, gymPoolSize };
}

export type LiftCardSortKey = "strongest" | "weakest" | "recentPr" | "alphabetical";

export const LIFT_CARD_SORT_OPTIONS: { key: LiftCardSortKey; label: string }[] = [
  { key: "strongest", label: "Strongest" },
  { key: "weakest", label: "Weakest" },
  { key: "recentPr", label: "Recent PR" },
  { key: "alphabetical", label: "A–Z" },
];

export function sortLiftRankCards(cards: LiftRankCard[], sortKey: LiftCardSortKey): LiftRankCard[] {
  const sorted = [...cards];
  switch (sortKey) {
    case "strongest":
      return sorted.sort((a, b) => b.score - a.score);
    case "weakest":
      return sorted.sort((a, b) => a.score - b.score);
    case "recentPr":
      return sorted.sort((a, b) => b.prDeltaKg - a.prDeltaKg);
    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function overallPowerScore(cards: LiftRankCard[]): number {
  return cards.reduce((sum, card) => sum + card.score, 0);
}

export function highestTier(cards: LiftRankCard[]): RankTier {
  return cards.reduce<RankTier>(
    (highest, card) => (RANK_TIERS.indexOf(card.tier) > RANK_TIERS.indexOf(highest) ? card.tier : highest),
    RANK_TIERS[0],
  );
}
