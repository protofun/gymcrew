import type { Ionicons } from "@expo/vector-icons";

import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { fromDateKey, toDateKey } from "@/lib/date";

export type ChallengeMetric =
  | { type: "muscleVolume"; muscleGroup: MuscleGroup }
  | { type: "totalVolume" }
  | { type: "totalWorkouts" }
  | { type: "totalSets" }
  | { type: "exerciseVolume"; exerciseId: string; exerciseName: string }
  | { type: "exerciseReps"; exerciseId: string; exerciseName: string };

export type ChallengeTemplate = {
  id: string;
  name: string;
  description: string;
  metric: ChallengeMetric;
  /** A fair target for ONE crew member — a crew's real target is this × member count, so a 2-person and a 15-person crew face the same per-person difficulty. */
  perMemberTarget: number;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Core",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  glutes: "Glutes",
};

const MUSCLE_BASE_TARGET_KG: Record<MuscleGroup, number> = {
  chest: 2500,
  back: 2800,
  shoulders: 1800,
  biceps: 1200,
  triceps: 1400,
  abs: 700,
  quads: 3200,
  hamstrings: 2000,
  calves: 1000,
  glutes: 2200,
};

const MUSCLE_ICON: Record<MuscleGroup, keyof typeof Ionicons.glyphMap> = {
  chest: "barbell-outline",
  back: "body-outline",
  shoulders: "body-outline",
  biceps: "barbell-outline",
  triceps: "barbell-outline",
  abs: "accessibility-outline",
  quads: "walk-outline",
  hamstrings: "walk-outline",
  calves: "walk-outline",
  glutes: "walk-outline",
};

const MUSCLE_TIERS = [
  { suffix: "Starter", multiplier: 1 },
  { suffix: "Domination", multiplier: 1.7 },
  { suffix: "Annihilation", multiplier: 2.6 },
] as const;

function muscleVolumeChallenges(): ChallengeTemplate[] {
  return ALL_MUSCLE_GROUPS.flatMap((group) =>
    MUSCLE_TIERS.map((tier) => ({
      id: `${group}-volume-${tier.suffix.toLowerCase()}`,
      name: `${MUSCLE_LABEL[group]} ${tier.suffix}`,
      description: `Stack ${MUSCLE_LABEL[group].toLowerCase()} volume as a crew — every set counts.`,
      metric: { type: "muscleVolume" as const, muscleGroup: group },
      perMemberTarget: Math.round(MUSCLE_BASE_TARGET_KG[group] * tier.multiplier),
      unit: "kg",
      icon: MUSCLE_ICON[group],
    })),
  );
}

// Verified against data/exercises.json / free-exercise-db ids used elsewhere in this codebase
// (see data/workout-templates.ts) — these exact ids exist in EXERCISE_BY_ID.
export const BARBELL_EXERCISES: { exerciseId: string; exerciseName: string; baseTargetKg: number }[] = [
  { exerciseId: "Barbell_Bench_Press_-_Medium_Grip", exerciseName: "Bench Press", baseTargetKg: 2000 },
  { exerciseId: "Barbell_Squat", exerciseName: "Squat", baseTargetKg: 2500 },
  { exerciseId: "Barbell_Deadlift", exerciseName: "Deadlift", baseTargetKg: 2200 },
  { exerciseId: "Barbell_Shoulder_Press", exerciseName: "Overhead Press", baseTargetKg: 1000 },
  { exerciseId: "Bent_Over_Barbell_Row", exerciseName: "Barbell Row", baseTargetKg: 1800 },
  { exerciseId: "Barbell_Curl", exerciseName: "Barbell Curl", baseTargetKg: 800 },
  { exerciseId: "Wide-Grip_Lat_Pulldown", exerciseName: "Lat Pulldown", baseTargetKg: 1500 },
  { exerciseId: "Leg_Press", exerciseName: "Leg Press", baseTargetKg: 3000 },
  { exerciseId: "Barbell_Hip_Thrust", exerciseName: "Hip Thrust", baseTargetKg: 2000 },
  { exerciseId: "Standing_Calf_Raises", exerciseName: "Calf Raise", baseTargetKg: 1200 },
];

export const BODYWEIGHT_EXERCISES: { exerciseId: string; exerciseName: string; baseTargetReps: number }[] = [
  { exerciseId: "Push-Up_Wide", exerciseName: "Push-Up", baseTargetReps: 150 },
  { exerciseId: "Pullups", exerciseName: "Pull-Up", baseTargetReps: 40 },
  { exerciseId: "Sit-Up", exerciseName: "Sit-Up", baseTargetReps: 200 },
  { exerciseId: "Bodyweight_Squat", exerciseName: "Bodyweight Squat", baseTargetReps: 180 },
  { exerciseId: "Mountain_Climbers", exerciseName: "Mountain Climber", baseTargetReps: 150 },
  { exerciseId: "Dips_-_Triceps_Version", exerciseName: "Dip", baseTargetReps: 80 },
];

const EXERCISE_TIERS = [
  { suffix: "Challenge", multiplier: 1 },
  { suffix: "Gauntlet", multiplier: 1.6 },
  { suffix: "Legend", multiplier: 2.4 },
] as const;

function exerciseVolumeChallenges(): ChallengeTemplate[] {
  return BARBELL_EXERCISES.flatMap((exercise) =>
    EXERCISE_TIERS.map((tier) => ({
      id: `${exercise.exerciseId}-volume-${tier.suffix.toLowerCase()}`,
      name: `${exercise.exerciseName} ${tier.suffix}`,
      description: `Rack up ${exercise.exerciseName.toLowerCase()} volume together as a crew.`,
      metric: { type: "exerciseVolume" as const, exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName },
      perMemberTarget: Math.round(exercise.baseTargetKg * tier.multiplier),
      unit: "kg",
      icon: "barbell-outline" as const,
    })),
  );
}

function exerciseRepsChallenges(): ChallengeTemplate[] {
  return BODYWEIGHT_EXERCISES.flatMap((exercise) =>
    EXERCISE_TIERS.map((tier) => ({
      id: `${exercise.exerciseId}-reps-${tier.suffix.toLowerCase()}`,
      name: `${exercise.exerciseName} ${tier.suffix}`,
      description: `Do ${exercise.exerciseName.toLowerCase()}s as a crew — every rep adds up.`,
      metric: { type: "exerciseReps" as const, exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName },
      perMemberTarget: Math.round(exercise.baseTargetReps * tier.multiplier),
      unit: "reps",
      icon: "body-outline" as const,
    })),
  );
}

const TOTAL_VOLUME_TIERS: { name: string; perMemberTarget: number }[] = [
  { name: "Iron Spark", perMemberTarget: 4000 },
  { name: "Iron Marathon", perMemberTarget: 8000 },
  { name: "Iron Odyssey", perMemberTarget: 12000 },
  { name: "Steel Storm", perMemberTarget: 16000 },
  { name: "Titan's Trial", perMemberTarget: 20000 },
  { name: "Volume Vortex", perMemberTarget: 25000 },
  { name: "Colossus Run", perMemberTarget: 30000 },
  { name: "Endless Iron", perMemberTarget: 40000 },
];

function totalVolumeChallenges(): ChallengeTemplate[] {
  return TOTAL_VOLUME_TIERS.map((tier, index) => ({
    id: `total-volume-${index}`,
    name: tier.name,
    description: "Every kilogram lifted by anyone in the crew adds to the total.",
    metric: { type: "totalVolume" as const },
    perMemberTarget: tier.perMemberTarget,
    unit: "kg",
    icon: "flash-outline" as const,
  }));
}

const TOTAL_WORKOUT_TIERS: { name: string; perMemberTarget: number }[] = [
  { name: "Consistency Crew", perMemberTarget: 2 },
  { name: "Showing Up", perMemberTarget: 3 },
  { name: "No Days Wasted", perMemberTarget: 4 },
  { name: "Relentless Crew", perMemberTarget: 5 },
  { name: "Grind Mode", perMemberTarget: 6 },
  { name: "Unbreakable", perMemberTarget: 7 },
  { name: "Iron Discipline", perMemberTarget: 8 },
  { name: "Never Miss", perMemberTarget: 10 },
];

function totalWorkoutsChallenges(): ChallengeTemplate[] {
  return TOTAL_WORKOUT_TIERS.map((tier, index) => ({
    id: `total-workouts-${index}`,
    name: tier.name,
    description: "Show up. Every logged workout counts toward the crew total.",
    metric: { type: "totalWorkouts" as const },
    perMemberTarget: tier.perMemberTarget,
    unit: "workouts",
    icon: "calendar-outline" as const,
  }));
}

const TOTAL_SET_TIERS: { name: string; perMemberTarget: number }[] = [
  { name: "Set Starter", perMemberTarget: 20 },
  { name: "Set Storm", perMemberTarget: 40 },
  { name: "Set Siege", perMemberTarget: 60 },
  { name: "Rep Riot", perMemberTarget: 80 },
  { name: "Set Marathon", perMemberTarget: 100 },
  { name: "Endless Sets", perMemberTarget: 130 },
];

function totalSetsChallenges(): ChallengeTemplate[] {
  return TOTAL_SET_TIERS.map((tier, index) => ({
    id: `total-sets-${index}`,
    name: tier.name,
    description: "Grind out working sets as a crew — quality reps, every one counted.",
    metric: { type: "totalSets" as const },
    perMemberTarget: tier.perMemberTarget,
    unit: "sets",
    icon: "layers-outline" as const,
  }));
}

/** ~100 predefined challenges, generated from a handful of building blocks so the pool stays easy to tune. */
export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  ...muscleVolumeChallenges(),
  ...exerciseVolumeChallenges(),
  ...exerciseRepsChallenges(),
  ...totalVolumeChallenges(),
  ...totalWorkoutsChallenges(),
  ...totalSetsChallenges(),
];

const CHALLENGES_PER_WEEK = 3;
export const CHALLENGE_DURATION_DAYS = 7;
/** Completing a weekly challenge bumps the crew's division XP by this much. */
export const CHALLENGE_XP_REWARD = 300;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

export type WeeklyChallenge = ChallengeTemplate & {
  /** Stable per-week id, e.g. "chest-volume-starter-2026-08-17" — the challenge-store progress key. */
  instanceId: string;
  weekKey: string;
  durationDays: number;
};

function pickWeekly(weekKey: string): WeeklyChallenge[] {
  const pool = CHALLENGE_TEMPLATES;
  const startIndex = hashString(weekKey) % pool.length;
  const picks: ChallengeTemplate[] = [];
  const seen = new Set<string>();
  for (let i = 0; picks.length < CHALLENGES_PER_WEEK && i < pool.length; i++) {
    const template = pool[(startIndex + i * 7) % pool.length]; // step by 7 for more spread across categories
    if (seen.has(template.id)) continue;
    seen.add(template.id);
    picks.push(template);
  }
  return picks.map((template) => ({
    ...template,
    instanceId: `${template.id}-${weekKey}`,
    weekKey,
    durationDays: CHALLENGE_DURATION_DAYS,
  }));
}

/** The same 3 challenges for every crew this week — fairness depends on this staying identical across crews; only the per-crew target (perMemberTarget × member count) differs. */
export function activeWeeklyChallenges(weekKey: string): WeeklyChallenge[] {
  return pickWeekly(weekKey);
}

/** The challenges scheduled for a future week, so people can see what's coming before it starts. */
export function upcomingWeeklyChallenges(
  weeksAhead: number,
  referenceWeekKey: string,
): { weekKey: string; challenges: WeeklyChallenge[] }[] {
  const results: { weekKey: string; challenges: WeeklyChallenge[] }[] = [];
  let cursor = fromDateKey(referenceWeekKey);
  for (let i = 1; i <= weeksAhead; i++) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    const weekKey = toDateKey(cursor);
    results.push({ weekKey, challenges: pickWeekly(weekKey) });
  }
  return results;
}
