import type { Exercise } from "@/data/exercises";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import type { LiftRankCard } from "@/lib/lift-rank-cards";
import { RANK_TIERS, type RankProfile, type RankTier } from "@/lib/rank";
import { rankForHypotheticalWeight } from "@/lib/rank-simulator";

export type RankHistoryEntry = {
  tier: RankTier;
  achievedAt: number;
  weightKg: number;
};

export type RecordHistoryPoint = { weightKg: number; reps: number; achievedAt: number };

/**
 * A real "when did I first reach each tier" timeline for one lift, newest first — built from every
 * PR ever logged (see backend/routes/records.php's `personal_record_history`, fetched via
 * `api.getRecordHistory`), not an invented climb. Walks the real PRs oldest-first and records a
 * milestone only the first time the tier genuinely goes up, so repeat PRs within the same tier
 * don't clutter the timeline. `currentRecord` (today's live best) is folded in too, since a PR set
 * before this history table existed only survives there — safe to include even if it's already
 * represented in `history`, since a tier that hasn't increased is never recorded twice.
 */
export function realRankHistoryForLift(
  history: RecordHistoryPoint[],
  currentRecord: { weightKg: number; reps: number; achievedAt: number } | null,
  knownCard: LiftRankCard | null,
  exercise: Exercise | null,
  profile: RankProfile,
): RankHistoryEntry[] {
  function tierForWeight(weightKg: number, reps: number): RankTier {
    if (knownCard) return rankForHypotheticalWeight(knownCard, weightKg, profile).tier;
    if (exercise) return genericExerciseRankDetail(exercise, weightKg, reps, profile).tier;
    return "rookie";
  }

  const points = [...history];
  if (currentRecord) points.push(currentRecord);
  const chronological = points.sort((a, b) => a.achievedAt - b.achievedAt);

  const milestones: RankHistoryEntry[] = [];
  let highestTierIndex = -1;
  for (const point of chronological) {
    const tier = tierForWeight(point.weightKg, point.reps);
    const tierIndex = RANK_TIERS.indexOf(tier);
    if (tierIndex > highestTierIndex) {
      highestTierIndex = tierIndex;
      milestones.push({ tier, achievedAt: point.achievedAt, weightKg: point.weightKg });
    }
  }

  return milestones.reverse();
}
