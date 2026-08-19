import type { MuscleGroup } from "@/data/workout-log";
import type { Gender } from "@/store/onboarding-store";

export const RANK_TIERS = [
  "rookie",
  "novice",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "elite",
  "master",
  "grandmaster",
  "champion",
  "titan",
  "mythic",
  "immortal",
  "legend",
] as const;

export type RankTier = (typeof RANK_TIERS)[number];

export function formatRankTier(tier: RankTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/** A distinct color per tier (reuses the same values as the crew/player division ladder's palette
 * for every name the two ladders share, so the app's color language for "rank" stays consistent). */
export const RANK_TIER_COLOR: Record<RankTier, string> = {
  rookie: "#B0A183",
  novice: "#6FCF3D",
  bronze: "#CD7F32",
  silver: "#9FB4C7",
  gold: "#FFD700",
  platinum: "#4FD1C5",
  diamond: "#4FC3F7",
  elite: "#9B6DFF",
  master: "#FF5252",
  grandmaster: "#A855F7",
  champion: "#FF7043",
  titan: "#8E8E99",
  mythic: "#C084FC",
  immortal: "#FFD54F",
  legend: "#FFB300",
};

/** The four "major lifts" fair ranking applies to — exercise ids from the library (data/exercises.ts). */
export const MAJOR_LIFT_EXERCISE_IDS = {
  benchPress: "Barbell_Bench_Press_-_Medium_Grip",
  squat: "Barbell_Squat",
  deadlift: "Barbell_Deadlift",
  overheadPress: "Barbell_Shoulder_Press",
} as const;

export type MajorLift = keyof typeof MAJOR_LIFT_EXERCISE_IDS;

const EXERCISE_ID_TO_LIFT: Record<string, MajorLift> = Object.fromEntries(
  Object.entries(MAJOR_LIFT_EXERCISE_IDS).map(([lift, id]) => [id, lift as MajorLift]),
);

export function majorLiftForExerciseId(exerciseId: string): MajorLift | null {
  return EXERCISE_ID_TO_LIFT[exerciseId] ?? null;
}

// Mock sessions only record a primary-exercise NAME (see data/workout-log.ts's WORKOUT_SPLITS —
// there's no exercise-library id attached), so this maps the four possible names back to the
// major-lift exercise ids `calculateLiftRank` needs.
export const MOCK_MAJOR_LIFT_NAME_TO_ID: Record<string, string> = {
  "Bench Press": MAJOR_LIFT_EXERCISE_IDS.benchPress,
  Squat: MAJOR_LIFT_EXERCISE_IDS.squat,
  Deadlift: MAJOR_LIFT_EXERCISE_IDS.deadlift,
  "Overhead Press": MAJOR_LIFT_EXERCISE_IDS.overheadPress,
};

const MAJOR_LIFT_MOCK_NAME: Record<MajorLift, string> = {
  benchPress: "Bench Press",
  squat: "Squat",
  deadlift: "Deadlift",
  overheadPress: "Overhead Press",
};

export function mockNameForMajorLift(lift: MajorLift): string {
  return MAJOR_LIFT_MOCK_NAME[lift];
}

/**
 * Each muscle group's fair rank is proxied by the major lift that trains it hardest — there's no
 * per-muscle strength standard, so this is an approximation, documented rather than precise.
 * Forearms fold into "biceps" (see muscle-groups.ts's library-name mapping), so there's no separate
 * entry for them here. Abs key off the deadlift (a heavy pull is a core lift, not a leg lift) — only
 * the four true leg groups key off the squat, so a lifter who skips leg day shows it consistently
 * across the lower body without dragging the whole core down with it.
 */
export const MUSCLE_GROUP_MAJOR_LIFT: Record<MuscleGroup, MajorLift> = {
  chest: "benchPress",
  triceps: "benchPress",
  shoulders: "overheadPress",
  back: "deadlift",
  biceps: "deadlift",
  abs: "deadlift",
  quads: "squat",
  hamstrings: "squat",
  calves: "squat",
  glutes: "squat",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** Mock members have no stored gender/bodyweight — a stable one is derived from their id, the same
 * seeded-mock approach used elsewhere (e.g. member-mock-profile.ts's memberXp). */
export function mockProfileFor(memberId: string): RankProfile {
  const hash = hashString(memberId);
  return { gender: hash % 2 === 0 ? "male" : "female", bodyWeightKg: 62 + (hash % 45) };
}

/**
 * Bodyweight-relative 1RM ratios (lift ÷ bodyweight) at five recognized strength levels —
 * Beginner, Novice, Intermediate, Advanced, Elite — approximating published strength-standard
 * tables (e.g. StrengthLevel/Symmetric Strength), separately for each gender since male and
 * female strength standards differ meaningfully at the same bodyweight.
 */
const STRENGTH_STANDARDS: Record<MajorLift, Record<Gender, number[]>> = {
  benchPress: { male: [0.5, 0.75, 1.0, 1.5, 1.75], female: [0.35, 0.5, 0.65, 1.0, 1.25] },
  squat: { male: [0.75, 1.0, 1.5, 2.0, 2.5], female: [0.6, 0.8, 1.15, 1.5, 2.0] },
  deadlift: { male: [1.0, 1.25, 1.75, 2.25, 2.75], female: [0.75, 1.0, 1.4, 1.75, 2.25] },
  overheadPress: { male: [0.35, 0.5, 0.7, 0.9, 1.1], female: [0.2, 0.3, 0.45, 0.6, 0.8] },
};

/** Each of the 5 strength-standard bands splits into 3 of our 15 rank tiers. */
function tierIndexForRatio(ratio: number, bandThresholds: number[]): number {
  const bounds = [0, ...bandThresholds, bandThresholds[4] * 1.5];
  for (let band = 0; band < 5; band++) {
    const lo = bounds[band];
    const hi = bounds[band + 1];
    if (ratio < hi || band === 4) {
      const frac = Math.max(0, Math.min(1, (ratio - lo) / (hi - lo)));
      const subTier = Math.min(2, Math.floor(frac * 3));
      return band * 3 + subTier;
    }
  }
  return RANK_TIERS.length - 1;
}

export type RankProfile = {
  gender: Gender;
  bodyWeightKg: number;
  /** Optional — masters lifters get a small, standard age-grading boost past 40. */
  age?: number;
};

/**
 * Ranks a lift fairly by normalizing for bodyweight and gender (the two factors real strength
 * standards are built on), plus a modest age adjustment for masters lifters past 40 — a common
 * practice in powerlifting age-grading, since hitting the same ratio later in life reflects more
 * relative strength. Height isn't a standard input to strength ratios, so it isn't factored in
 * here; bodyweight already captures most of what height would otherwise proxy for.
 */
export function calculateLiftRank(lift: MajorLift, liftWeightKg: number, profile: RankProfile): RankTier {
  const thresholds = STRENGTH_STANDARDS[lift][profile.gender];
  let ratio = liftWeightKg / profile.bodyWeightKg;

  if (profile.age && profile.age > 40) {
    const yearsOver = Math.min(profile.age - 40, 30);
    ratio *= 1 + yearsOver * 0.006; // ~0.6%/year, capped around +18% at age 70
  }

  return RANK_TIERS[tierIndexForRatio(ratio, thresholds)];
}
