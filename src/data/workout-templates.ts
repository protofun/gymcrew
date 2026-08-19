import type { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

import { exerciseImages } from "@/constants/images";

export type WorkoutTemplate = {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  exerciseIds: string[];
};

/**
 * Reusable "day" templates, shared across splits below. Exercise ids are verified entries in
 * data/exercises.json (free-exercise-db) — see EXERCISE_BY_ID in data/exercises.ts.
 */
const DAY_TEMPLATES = {
  push: {
    key: "push",
    name: "Push Day",
    icon: "arrow-up-circle-outline",
    exerciseIds: [
      "Barbell_Bench_Press_-_Medium_Grip",
      "Barbell_Shoulder_Press",
      "Incline_Dumbbell_Press",
      "Side_Lateral_Raise",
      "Triceps_Pushdown",
    ],
  },
  pull: {
    key: "pull",
    name: "Pull Day",
    icon: "arrow-down-circle-outline",
    exerciseIds: ["Pullups", "Bent_Over_Barbell_Row", "Wide-Grip_Lat_Pulldown", "Face_Pull", "Barbell_Curl"],
  },
  legs: {
    key: "legs",
    name: "Leg Day",
    icon: "walk-outline",
    exerciseIds: ["Barbell_Squat", "Romanian_Deadlift", "Leg_Press", "Lying_Leg_Curls", "Standing_Calf_Raises"],
  },
  upper: {
    key: "upper",
    name: "Upper Body",
    icon: "body-outline",
    exerciseIds: [
      "Barbell_Bench_Press_-_Medium_Grip",
      "Bent_Over_Barbell_Row",
      "Barbell_Shoulder_Press",
      "Wide-Grip_Lat_Pulldown",
      "Barbell_Curl",
      "Triceps_Pushdown",
    ],
  },
  lower: {
    key: "lower",
    name: "Lower Body",
    icon: "walk-outline",
    exerciseIds: ["Barbell_Squat", "Barbell_Deadlift", "Leg_Press", "Lying_Leg_Curls", "Standing_Calf_Raises"],
  },
  fullBodyA: {
    key: "fullBodyA",
    name: "Full Body A",
    icon: "fitness-outline",
    exerciseIds: ["Barbell_Squat", "Barbell_Bench_Press_-_Medium_Grip", "Bent_Over_Barbell_Row", "Barbell_Shoulder_Press", "Plank"],
  },
  fullBodyB: {
    key: "fullBodyB",
    name: "Full Body B",
    icon: "fitness-outline",
    exerciseIds: ["Barbell_Deadlift", "Incline_Dumbbell_Press", "Pullups", "Dumbbell_Lunges", "Crunches"],
  },
  chest: {
    key: "chest",
    name: "Chest Day",
    icon: "body-outline",
    exerciseIds: [
      "Barbell_Bench_Press_-_Medium_Grip",
      "Incline_Dumbbell_Press",
      "Dumbbell_Flyes",
      "Cable_Crossover",
      "Dips_-_Triceps_Version",
    ],
  },
  back: {
    key: "back",
    name: "Back Day",
    icon: "body-outline",
    exerciseIds: ["Barbell_Deadlift", "Pullups", "Bent_Over_Barbell_Row", "Wide-Grip_Lat_Pulldown", "Seated_Cable_Rows"],
  },
  shoulders: {
    key: "shoulders",
    name: "Shoulders Day",
    icon: "body-outline",
    exerciseIds: ["Barbell_Shoulder_Press", "Side_Lateral_Raise", "Face_Pull", "Upright_Barbell_Row", "Barbell_Shrug"],
  },
  arms: {
    key: "arms",
    name: "Arms Day",
    icon: "barbell-outline",
    exerciseIds: ["Barbell_Curl", "Hammer_Curls", "Triceps_Pushdown", "Triceps_Overhead_Extension_with_Rope", "Dips_-_Triceps_Version"],
  },
  glutes: {
    key: "glutes",
    name: "Glute Focus",
    icon: "walk-outline",
    exerciseIds: ["Barbell_Hip_Thrust", "Barbell_Squat", "Romanian_Deadlift", "Split_Squats", "Standing_Calf_Raises"],
  },
  bodyweightFull: {
    key: "bodyweightFull",
    name: "Bodyweight Full Body",
    icon: "accessibility-outline",
    exerciseIds: ["Push-Up_Wide", "Pullups", "Bodyweight_Squat", "Plank", "Split_Squats"],
  },
} as const satisfies Record<string, WorkoutTemplate>;

type DayTemplateKey = keyof typeof DAY_TEMPLATES;

/** A representative exercise photo per day template, for hero-image spots like the crew's Today's Plan card. */
const DAY_TEMPLATE_HERO_IMAGE: Record<DayTemplateKey, ImageSourcePropType> = {
  push: exerciseImages.benchPress,
  pull: exerciseImages.pullUp,
  legs: exerciseImages.squat,
  upper: exerciseImages.benchPress,
  lower: exerciseImages.squat,
  fullBodyA: exerciseImages.squat,
  fullBodyB: exerciseImages.deadlift,
  chest: exerciseImages.benchPress,
  back: exerciseImages.deadlift,
  shoulders: exerciseImages.shoulderPress,
  arms: exerciseImages.barbellCurl,
  glutes: exerciseImages.lunge,
  bodyweightFull: exerciseImages.plank,
};

/** Day template display name (e.g. "Leg Day") → hero photo, for screens that only know the workout's name. */
export const WORKOUT_NAME_HERO_IMAGE: Record<string, ImageSourcePropType> = Object.fromEntries(
  Object.values(DAY_TEMPLATES).map((template) => [template.name, DAY_TEMPLATE_HERO_IMAGE[template.key as DayTemplateKey]]),
);

/** Maps each onboarding split choice to an ordered set of day templates. Splits without a close
 * match (named programs like 5/3/1, GZCLP, Westside) fall back to the closest generic shape. */
const SPLIT_TEMPLATE_KEYS: Record<string, DayTemplateKey[]> = {
  "Full Body": ["fullBodyA", "fullBodyB"],
  "Upper / Lower": ["upper", "lower"],
  "Push / Pull / Legs": ["push", "pull", "legs"],
  "Push / Pull / Legs (2x Weekly)": ["push", "pull", "legs"],
  "Bro Split (Body Part Split)": ["chest", "back", "shoulders", "arms", "legs"],
  "Arnold Split": ["chest", "back", "shoulders", "arms", "legs"],
  "PHUL (Power Hypertrophy Upper Lower)": ["upper", "lower"],
  "PHAT (Power Hypertrophy Adaptive Training)": ["upper", "lower", "legs"],
  "5/3/1 (Wendler)": ["push", "pull", "legs"],
  "StrongLifts 5x5": ["fullBodyA", "fullBodyB"],
  "Starting Strength": ["fullBodyA", "fullBodyB"],
  "Texas Method": ["fullBodyA", "fullBodyB", "upper"],
  GZCLP: ["fullBodyA", "fullBodyB"],
  "German Volume Training": ["push", "pull", "legs"],
  "Conjugate Method (Westside)": ["chest", "back", "legs"],
  "Powerlifting Split": ["fullBodyA", "fullBodyB"],
  "Circuit Training": ["bodyweightFull"],
  "CrossFit / WOD": ["bodyweightFull", "fullBodyA"],
  "Calisthenics / Bodyweight": ["bodyweightFull"],
  "Glute Focus / Lower Body Emphasis": ["glutes", "lower"],
  "Other / Custom": ["push", "pull", "legs"],
};

const DEFAULT_TEMPLATE_KEYS: DayTemplateKey[] = ["push", "pull", "legs"];

export const ALL_TEMPLATES: WorkoutTemplate[] = Object.values(DAY_TEMPLATES);

/** The day templates matching a chosen split, or a sensible Push/Pull/Legs default if unset/unknown. */
export function getTemplatesForSplit(split: string | undefined): WorkoutTemplate[] {
  const keys = (split && SPLIT_TEMPLATE_KEYS[split]) || DEFAULT_TEMPLATE_KEYS;
  return keys.map((key) => DAY_TEMPLATES[key]);
}
