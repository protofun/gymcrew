import type { MuscleGroup } from "@/data/workout-log";
import type { Exercise } from "@/data/exercises";
import { resolveMuscleGroup } from "@/lib/muscle-groups";
import {
  calculateLiftRankDetail,
  MUSCLE_GROUP_MAJOR_LIFT,
  RANK_TIERS,
  tierPositionForRatio,
  type LiftRankDetail,
  type RankProfile,
  type RankTier,
} from "@/lib/rank";
import type { PersonalRecord } from "@/store/personal-records-store";

/**
 * Isolation exercises train nowhere near as heavy as the compound lift they're proxied against (see
 * `MUSCLE_GROUP_MAJOR_LIFT`) — a solid barbell curl is a fraction of a deadlift. These flat
 * multipliers scale the effective weight up before the proxy ratio is computed, roughly calibrated
 * against typical curl/pushdown strength relative to deadlift/bench standards, so an isolation lift
 * lands in a believable tier instead of bottoming out near Rookie by default. Muscle groups not
 * listed here (chest, shoulders, back, quads, hamstrings, glutes) skip this — their generic
 * exercises tend to be closer in spirit to the compound lift they're proxied against (presses, rows,
 * leg presses), so the raw ratio is a fairer read.
 */
const ISOLATION_MULTIPLIER: Partial<Record<MuscleGroup, number>> = {
  biceps: 3,
  triceps: 2,
};

/** Equipment where the logged number is the load per hand, not the total — e.g. "20kg dumbbell
 * curls" means 20kg in each hand, roughly comparable effort to a 40kg barbell curl. Doubled so
 * dumbbell/kettlebell numbers are comparable to a barbell exercise's total-load standard. An
 * approximation: some dumbbell moves are single-limb-at-a-time rather than both sides at once,
 * which this can't distinguish from the exercise-library data alone. */
const PER_SIDE_EQUIPMENT = new Set(["dumbbell", "kettlebells"]);

/** Core work is almost always trained for reps, not added weight — a "how many crunches" number
 * that stays fair without needing a bodyweight-ratio at all. Flat (not gendered): rep-endurance
 * standards don't split as cleanly by gender as absolute-strength ones do, so a shared ladder is
 * more honest than inventing a gendered split with no real basis. */
const ABS_REPS_STANDARDS = [15, 25, 40, 60, 100];

/**
 * Ranks any exercise from the library (not just the 9 tracked lifts) by proxying through the major
 * lift that trains its primary muscle hardest — only the 4 major lifts have a real bodyweight-ratio
 * strength standard, so this is an approximation for the other 800+. Two corrections keep that
 * approximation honest (see `PER_SIDE_EQUIPMENT` and `ISOLATION_MULTIPLIER` above); ab/core work
 * skips weight entirely and ranks by reps instead, since it's usually bodyweight or lightly loaded.
 */
export function genericExerciseRankDetail(exercise: Exercise, weightKg: number, reps: number, profile: RankProfile): LiftRankDetail {
  const primaryGroup = exercise.primaryMuscles.map(resolveMuscleGroup).find((group) => group !== null) ?? null;

  if (primaryGroup === "abs") {
    const { index, progressToNextTier } = tierPositionForRatio(reps, ABS_REPS_STANDARDS);
    return { tier: RANK_TIERS[index], progressToNextTier, kgToNextTier: null };
  }

  const majorLift = primaryGroup ? MUSCLE_GROUP_MAJOR_LIFT[primaryGroup] : "benchPress";
  const perSideMultiplier = PER_SIDE_EQUIPMENT.has(exercise.equipment ?? "") ? 2 : 1;
  const isolationMultiplier = (primaryGroup && ISOLATION_MULTIPLIER[primaryGroup]) ?? 1;
  const effectiveWeightKg = weightKg * perSideMultiplier * isolationMultiplier;

  return calculateLiftRankDetail(majorLift, effectiveWeightKg, profile);
}

/**
 * The single tier for any exercise from the library — one of the 9 tracked lifts' precise card if
 * it's among `cards`, otherwise the muscle-group-proxy estimate (see `genericExerciseRankDetail`)
 * for the other 800+. Exported so every exercise-picker leading badge across the app (workout
 * logging, rank pickers, member stats) can show the same medal instead of a duplicated per-screen
 * lookup — an exercise with no PR on record naturally lands on Rookie (0 weight → 0 ratio), same as
 * the rest of the app's "no data yet" convention. `cards` only needs `exerciseId`/`tier`, so any of
 * the app's several lift-card shapes (LiftRankCard, DisplayLiftCard, ...) works as-is.
 */
export function tierForExercise(
  exercise: Exercise,
  cards: { exerciseId: string; tier: RankTier }[],
  records: Record<string, PersonalRecord>,
  profile: RankProfile,
): RankTier {
  const knownCard = cards.find((card) => card.exerciseId === exercise.id);
  if (knownCard) return knownCard.tier;

  const record = records[exercise.id];
  return genericExerciseRankDetail(exercise, record?.bestWeightKg ?? 0, record?.bestReps ?? 0, profile).tier;
}
