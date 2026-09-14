import { EXERCISE_BY_ID } from "@/data/exercises";
import type { LiftCardId } from "@/data/rank-lifts";
import type { RankStanding } from "@/lib/api";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { applyRankScope, buildLiftRankCards, SCORE_PER_BODYWEIGHT_RATIO, type RankScope } from "@/lib/lift-rank-cards";
import { RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import type { PersonalRecord } from "@/store/personal-records-store";

/** A tile on the Ranks tab's grid — either one of the 9 built-in tracked lifts or any other
 * exercise the user has a real record for. Deliberately not `LiftRankCard` itself: an exercise
 * outside the 9 doesn't have a `LiftCardId`, a curated image, or a real PR-delta history, so this
 * only keeps the fields a grid tile and the sort options actually need. */
export type DisplayLiftCard = {
  id: string;
  name: string;
  exerciseId: string;
  tier: RankTier;
  score: number;
  percentileInTier: number;
  /** Real standing among other real users who share your gym — `null` when there's not enough
   * real data yet (see backend/routes/rank-standings.php / lift-rank-cards.ts's `LiftRankCard`). */
  gymRank: number | null;
  gymPoolSize: number | null;
  isWeakPoint: boolean;
  isCustom: boolean;
  bestWeightKg: number;
  /** `null` outside the 9 tracked lifts — there's no seeded PR-delta history for those, so the card
   * shows its best weight instead. */
  prDeltaKg: number | null;
};

/** How many achievements the Ranks tab auto-fills before you have to pin more yourself. */
const MAX_AUTO_RANKS_BOARD_SIZE = 12;

/**
 * The Ranks tab's own tile list — auto-curated from every exercise the user actually has a
 * personal record for (not just the 9 built-in tracked lifts), sorted best-rank-first and capped
 * at 12; a new better achievement always bumps the weakest of the current 12 out automatically.
 * `customExerciseIds` pins exercises beyond that automatic set (shown regardless of rank, even
 * with no record yet — a placeholder inviting you to start logging it); `removedDefaultIds` /
 * `hiddenAchievementIds` are explicit user overrides that keep something out regardless of rank.
 *
 * This is THE canonical "what does this user's board actually show" computation — reuse it
 * (not `buildLiftRankCards` alone) anywhere that needs to match what the Ranks tab displays (its
 * Overall Power figure, the workout-split generator's analysis step, rank-history, all-stats, ...),
 * or the two will quietly disagree the moment a user's board differs from the 9 built-in defaults.
 */
export function ranksBoardCards(
  records: Record<string, PersonalRecord>,
  profile: RankProfile,
  scope: RankScope,
  removedDefaultIds: LiftCardId[],
  hiddenAchievementIds: string[],
  customExerciseIds: string[],
  realGymStandings: Record<string, RankStanding | null> = {},
): DisplayLiftCard[] {
  const builtInCards = buildLiftRankCards(records, profile, scope, realGymStandings);
  const builtInByExerciseId = new Map(builtInCards.map((card) => [card.exerciseId, card]));

  function displayCardFor(exerciseId: string): DisplayLiftCard | null {
    const builtIn = builtInByExerciseId.get(exerciseId);
    if (builtIn) {
      return {
        id: builtIn.id,
        name: builtIn.name,
        exerciseId: builtIn.exerciseId,
        tier: builtIn.tier,
        score: builtIn.score,
        percentileInTier: builtIn.percentileInTier,
        gymRank: builtIn.gymRank,
        gymPoolSize: builtIn.gymPoolSize,
        isWeakPoint: builtIn.isWeakPoint,
        isCustom: false,
        bestWeightKg: builtIn.bestWeightKg,
        prDeltaKg: builtIn.prDeltaKg,
      };
    }

    const exercise = EXERCISE_BY_ID[exerciseId];
    if (!exercise) return null;
    const record = records[exerciseId];
    const bestWeightKg = record?.bestWeightKg ?? 0;
    const bestReps = record?.bestReps ?? 0;
    const detail = genericExerciseRankDetail(exercise, bestWeightKg, bestReps, profile);
    const score = Math.round((bestWeightKg / profile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    const { percentileInTier, gymRank, gymPoolSize } = applyRankScope(detail.progressToNextTier, realGymStandings[exercise.id] ?? null);
    return {
      id: exercise.id,
      name: exercise.name,
      exerciseId: exercise.id,
      tier: detail.tier,
      score,
      percentileInTier,
      gymRank,
      gymPoolSize,
      isWeakPoint: false,
      isCustom: true,
      bestWeightKg,
      prDeltaKg: null,
    };
  }

  function isHidden(card: DisplayLiftCard): boolean {
    if (!card.isCustom && removedDefaultIds.includes(card.id as LiftCardId)) return true;
    return hiddenAchievementIds.includes(card.exerciseId);
  }

  // Every exercise with a real record — the pool the auto-curated top 12 is drawn from. A great
  // lift on an exercise that was never explicitly tracked still counts; it just needs a record.
  const achieved = Object.keys(records)
    .map((exerciseId) => displayCardFor(exerciseId))
    .filter((card): card is DisplayLiftCard => card !== null && !isHidden(card));

  const sorted = [...achieved].sort(
    (a, b) => RANK_TIERS.indexOf(b.tier) - RANK_TIERS.indexOf(a.tier) || b.percentileInTier - a.percentileInTier || b.score - a.score,
  );
  const auto = sorted.slice(0, MAX_AUTO_RANKS_BOARD_SIZE);
  const autoIds = new Set(auto.map((card) => card.exerciseId));

  const pinned = customExerciseIds
    .filter((exerciseId) => !autoIds.has(exerciseId) && !hiddenAchievementIds.includes(exerciseId))
    .flatMap((exerciseId) => {
      const card = displayCardFor(exerciseId);
      return card ? [card] : [];
    });

  return [...auto, ...pinned];
}

export function ranksBoardPowerScore(cards: DisplayLiftCard[]): number {
  return cards.reduce((sum, card) => sum + card.score, 0);
}

/** Convenience wrapper for screens that only need the Overall Power number, not the full board
 * (e.g. workout-split's analysis step, profile's rank-history / all-stats) — see `ranksBoardCards`'s
 * doc comment for why this must be used instead of summing `buildLiftRankCards` directly. */
export function userOverallPowerScore(
  records: Record<string, PersonalRecord>,
  profile: RankProfile,
  removedDefaultIds: LiftCardId[],
  hiddenAchievementIds: string[],
  customExerciseIds: string[],
): number {
  return ranksBoardPowerScore(ranksBoardCards(records, profile, "gym", removedDefaultIds, hiddenAchievementIds, customExerciseIds));
}
