import type { ImageSourcePropType } from "react-native";

import { EXERCISE_BY_ID } from "@/data/exercises";
import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import type { RankStanding } from "@/lib/api";
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
  /** Real standing among other real users who share your gym (see backend/routes/rank-standings.php)
   * — `null` when there's not enough real data yet (no gym set, or fewer than 2 real peers for this
   * lift), which the UI shows as an honest "not enough data" state rather than a fake number. */
  gymRank: number | null;
  gymPoolSize: number | null;
  /** `null` until real PR-history tracking exists (personal-records-store only keeps the current
   * best, not a log of previous ones) — there's no real "since last PR" delta to show yet, so this
   * stays honestly unset rather than showing an illustrative/made-up number. */
  prDeltaKg: number | null;
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

/** Illustrative-only "your gym" pool per lift for a single curated comparison card (see
 * crew-lift-compare.ts, e.g. the "boss" comparison cards) — kept separate from the real gym rank
 * used on the Ranks tab itself (see backend/routes/rank-standings.php / `applyRankScope` below),
 * since a one-off illustrative comparison to a specific curated person is a different, clearly
 * scoped thing from "here's your real standing among real people at your gym." */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

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

/** The exercise's real name from the library — always used for a tracked lift's display name so it
 * matches exactly how the same exercise reads in the searchable exercise picker (see
 * data/rank-lifts.ts's doc comment above its type definitions). */
function exerciseName(exerciseId: string): string {
  return EXERCISE_BY_ID[exerciseId]?.name ?? exerciseId;
}

export function buildLiftRankCards(
  records: Record<string, PersonalRecord>,
  profile: RankProfile,
  scope: RankScope,
  realGymStandings: Record<string, RankStanding | null> = {},
): LiftRankCard[] {
  const computed = MAJOR_LIFT_CARDS.map((lift) => {
    const record = records[lift.exerciseId];
    const weightKg = record?.bestWeightKg ?? 0;
    const { tier, progressToNextTier, kgToNextTier } = calculateLiftRankDetail(lift.majorLift, weightKg, profile);
    const score = Math.round((weightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    return {
      id: lift.id,
      name: exerciseName(lift.exerciseId),
      image: lift.image,
      exerciseId: lift.exerciseId,
      tier,
      score,
      progressToNextTier,
      prDeltaKg: null,
      bestWeightKg: weightKg,
      bestReps: record?.bestReps ?? 0,
      kgToNextTier,
    };
  });

  // A logged PR always wins over the seed's calibration curve once one exists — see
  // estimateTierPositionForWeight in lib/rank.ts (there's no real strength-standard table for these
  // 8 lifts yet, so a real logged weight is placed on an approximated tier curve anchored on the
  // seed's assumed reference point, not a precise bodyweight-ratio formula). Without a real record,
  // this must NEVER show the seed's own tier/weight/reps as if they were something you'd actually
  // lifted — that reference point exists purely to calibrate the curve above, not to display.
  const seeded = SEEDED_LIFT_CARDS.map((lift) => {
    const record = records[lift.exerciseId];
    if (!record) {
      return {
        id: lift.id,
        name: exerciseName(lift.exerciseId),
        image: lift.image,
        exerciseId: lift.exerciseId,
        tier: RANK_TIERS[0],
        score: 0,
        progressToNextTier: 0,
        prDeltaKg: null,
        bestWeightKg: 0,
        bestReps: 0,
        kgToNextTier: null as number | null,
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
      name: exerciseName(lift.exerciseId),
      image: lift.image,
      exerciseId: lift.exerciseId,
      tier,
      score,
      progressToNextTier,
      prDeltaKg: null,
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
    const { percentileInTier, gymRank, gymPoolSize } = applyRankScope(card.progressToNextTier, realGymStandings[card.exerciseId] ?? null);

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

/** Folds in this lift's real gym standing (already fetched — see backend/routes/rank-standings.php
 * and (tabs)/ranks.tsx) — exported so a custom (non-tracked) exercise added to the Ranks overview
 * goes through the same shape as the 9 built-in lifts. `percentileInTier` is just the real,
 * individual tier progress now — there's no artificial "gym pool feels friendlier" boost anymore,
 * since the gym scope's own local flavor now comes from a real rank/pool number instead. */
export function applyRankScope(
  rawProgressToNextTier: number,
  realGymStanding: RankStanding | null,
): { percentileInTier: number; gymRank: number | null; gymPoolSize: number | null } {
  return {
    percentileInTier: Math.min(0.99, rawProgressToNextTier),
    gymRank: realGymStanding?.gymRank ?? null,
    gymPoolSize: realGymStanding?.gymPoolSize ?? null,
  };
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
      return sorted.sort((a, b) => (b.prDeltaKg ?? 0) - (a.prDeltaKg ?? 0));
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
