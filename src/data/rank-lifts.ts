import type { ImageSourcePropType } from "react-native";

import { exerciseImages } from "@/constants/images";
import { MAJOR_LIFT_EXERCISE_IDS, type MajorLift, type RankTier } from "@/lib/rank";

export type LiftCardId = "benchPress" | "squat" | "deadlift" | "overheadPress" | "pullUp" | "seatedRow" | "inclinePress" | "legPress" | "lunge";

type MajorLiftDefinition = {
  id: LiftCardId;
  name: string;
  image: ImageSourcePropType;
  exerciseId: string;
  majorLift: MajorLift;
  /** Most recent PR change, in kg — personal-records-store only keeps the current best, not a
   * history of previous ones, so this is illustrative until real PR history is tracked. */
  prDeltaKg: number;
};

/** A lift with no bodyweight-ratio strength standard yet (see rank.ts's `STRENGTH_STANDARDS`) — its
 * rank is seeded rather than computed, same as the rest of this screen's placeholder-free-but-mock
 * approach (e.g. data/player-leaderboard.ts). Real standards for these are a natural follow-up once
 * the rank engine covers more than the four major lifts. It still has a real `exerciseId` (unlike the
 * mock data it seeds) so a logged PR is real, and lib/lift-rank-cards.ts re-estimates its tier from it. */
type SeededLiftDefinition = {
  id: LiftCardId;
  name: string;
  image: ImageSourcePropType;
  exerciseId: string;
  tier: RankTier;
  score: number;
  /** Progress through the current tier toward the next, 0-1 — doubles as "percentile within tier". */
  progressToNextTier: number;
  /** Most recent PR change, in kg (negative if the last logged set was lighter than the prior best). */
  prDeltaKg: number;
  bestWeightKg: number;
  bestReps: number;
  /** Extra kg needed to reach the next tier — mocked here since there's no strength standard to
   * calculate it from yet (see rank.ts's `calculateLiftRankDetail`, which computes this for real for
   * the four major lifts). */
  kgToNextTier: number;
};

export const MAJOR_LIFT_CARDS: MajorLiftDefinition[] = [
  {
    id: "benchPress",
    name: "Bench Press",
    image: exerciseImages.benchPress,
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.benchPress,
    majorLift: "benchPress",
    prDeltaKg: 7.5,
  },
  { id: "squat", name: "Squat", image: exerciseImages.squat, exerciseId: MAJOR_LIFT_EXERCISE_IDS.squat, majorLift: "squat", prDeltaKg: 2.5 },
  {
    id: "deadlift",
    name: "Deadlift",
    image: exerciseImages.deadlift,
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.deadlift,
    majorLift: "deadlift",
    prDeltaKg: 10,
  },
  {
    id: "overheadPress",
    name: "Overhead Press",
    image: exerciseImages.shoulderPress,
    exerciseId: MAJOR_LIFT_EXERCISE_IDS.overheadPress,
    majorLift: "overheadPress",
    prDeltaKg: 5,
  },
];

export const SEEDED_LIFT_CARDS: SeededLiftDefinition[] = [
  {
    id: "pullUp",
    name: "Pull Up",
    image: exerciseImages.pullUp,
    exerciseId: "Pullups",
    tier: "gold",
    score: 6200,
    progressToNextTier: 0.6,
    prDeltaKg: 5,
    bestWeightKg: 20,
    bestReps: 6,
    kgToNextTier: 8,
  },
  {
    id: "seatedRow",
    name: "Seated Row",
    image: exerciseImages.seatedRow,
    exerciseId: "Seated_Cable_Rows",
    tier: "platinum",
    score: 6800,
    progressToNextTier: 0.7,
    prDeltaKg: 8,
    bestWeightKg: 85,
    bestReps: 8,
    kgToNextTier: 12,
  },
  {
    id: "inclinePress",
    name: "Incline Press",
    image: exerciseImages.inclineBenchPress,
    exerciseId: "Barbell_Incline_Bench_Press_-_Medium_Grip",
    tier: "silver",
    score: 3400,
    progressToNextTier: 0.4,
    prDeltaKg: 6,
    bestWeightKg: 70,
    bestReps: 5,
    kgToNextTier: 10,
  },
  {
    id: "legPress",
    name: "Leg Press",
    image: exerciseImages.legPress,
    exerciseId: "Leg_Press",
    tier: "bronze",
    score: 2100,
    progressToNextTier: 0.22,
    prDeltaKg: 3,
    bestWeightKg: 140,
    bestReps: 10,
    kgToNextTier: 30,
  },
  {
    id: "lunge",
    name: "Lunge",
    image: exerciseImages.lunge,
    exerciseId: "Barbell_Lunge",
    tier: "silver",
    score: 2600,
    progressToNextTier: 0.35,
    prDeltaKg: 4,
    bestWeightKg: 24,
    bestReps: 10,
    kgToNextTier: 6,
  },
];
