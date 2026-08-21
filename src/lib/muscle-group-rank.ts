import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import type { LiftCardId } from "@/data/rank-lifts";
import type { LiftRankCard } from "@/lib/lift-rank-cards";
import { RANK_TIERS, type RankTier } from "@/lib/rank";

type WeightedLift = { liftId: LiftCardId; weight: number };

/**
 * Which of the 9 tracked lifts feed each muscle group's composite rank, weighted by how
 * representative that lift is of the group — e.g. bench press counts for more of "chest" than
 * incline press does. A group missing here has no tracked exercise at all yet, so it renders as
 * "insufficient data" rather than a guessed rank (see MUSCLE_GROUP_SUGGESTED_EXERCISES below).
 */
const MUSCLE_GROUP_WEIGHTS: Partial<Record<MuscleGroup, WeightedLift[]>> = {
  chest: [
    { liftId: "benchPress", weight: 0.6 },
    { liftId: "inclinePress", weight: 0.4 },
  ],
  shoulders: [{ liftId: "overheadPress", weight: 1 }],
  back: [
    { liftId: "deadlift", weight: 0.5 },
    { liftId: "seatedRow", weight: 0.5 },
  ],
  triceps: [
    { liftId: "benchPress", weight: 0.55 },
    { liftId: "overheadPress", weight: 0.45 },
  ],
  quads: [
    { liftId: "squat", weight: 0.5 },
    { liftId: "legPress", weight: 0.35 },
    { liftId: "lunge", weight: 0.15 },
  ],
  hamstrings: [
    { liftId: "deadlift", weight: 0.45 },
    { liftId: "squat", weight: 0.25 },
    { liftId: "lunge", weight: 0.3 },
  ],
  glutes: [
    { liftId: "squat", weight: 0.35 },
    { liftId: "deadlift", weight: 0.3 },
    { liftId: "lunge", weight: 0.35 },
  ],
};

/** For a muscle group with no tracked exercise yet — what to suggest logging instead of guessing. */
export const MUSCLE_GROUP_SUGGESTED_EXERCISES: Partial<Record<MuscleGroup, string[]>> = {
  biceps: ["Barbell Curl", "Hammer Curl"],
  abs: ["Sit-Up", "Hanging Leg Raise", "Plank"],
  calves: ["Calf Raise"],
};

/** Illustrative — this app doesn't track per-exercise session counts yet, so this is a fixed hint
 * rather than a number computed from real logging history. */
const SESSIONS_NEEDED_HINT = 3;

export type MuscleGroupRank =
  | { status: "ranked"; tier: RankTier; tierIndex: number; contributingLifts: { liftId: LiftCardId; tier: RankTier; weight: number }[] }
  | { status: "insufficient-data"; suggestedExercises: string[]; sessionsNeeded: number };

/**
 * A rank per muscle group — the same 15-tier ladder every lift uses, composed from the weighted
 * average of that group's contributing lift tiers (see MUSCLE_GROUP_WEIGHTS). `cards` already
 * carries bodyweight/gender-normalized tiers (lib/lift-rank-cards.ts), so no separate normalization
 * is needed here.
 */
export function computeMuscleGroupRanks(cards: LiftRankCard[]): Partial<Record<MuscleGroup, MuscleGroupRank>> {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const result: Partial<Record<MuscleGroup, MuscleGroupRank>> = {};

  for (const group of ALL_MUSCLE_GROUPS) {
    const weights = MUSCLE_GROUP_WEIGHTS[group];
    if (!weights) {
      result[group] = {
        status: "insufficient-data",
        suggestedExercises: MUSCLE_GROUP_SUGGESTED_EXERCISES[group] ?? [],
        sessionsNeeded: SESSIONS_NEEDED_HINT,
      };
      continue;
    }

    const contributingLifts = weights.map(({ liftId, weight }) => ({ liftId, weight, tier: cardById.get(liftId)!.tier }));
    const totalWeight = weights.reduce((sum, lift) => sum + lift.weight, 0);
    const weightedIndex = contributingLifts.reduce((sum, lift) => sum + RANK_TIERS.indexOf(lift.tier) * lift.weight, 0) / totalWeight;
    const tierIndex = Math.max(0, Math.min(RANK_TIERS.length - 1, Math.round(weightedIndex)));

    result[group] = { status: "ranked", tier: RANK_TIERS[tierIndex], tierIndex, contributingLifts };
  }

  return result;
}
