/**
 * Exercise library — name, muscles, equipment, instructions, and a demo
 * photo for 800+ exercises. Sourced from free-exercise-db
 * (github.com/yuhonas/free-exercise-db), a public-domain (Unlicense)
 * dataset. `exercises.json` is a trimmed copy of their `dist/exercises.json`;
 * images are served straight off GitHub's raw CDN, so there's no API key
 * and no cost.
 */
import rawExercises from "./exercises.json";

const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export type ExerciseCategory =
  | "strength"
  | "stretching"
  | "plyometrics"
  | "strongman"
  | "powerlifting"
  | "cardio"
  | "olympic weightlifting";

export type ExerciseLevel = "beginner" | "intermediate" | "expert";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  level: ExerciseLevel;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrl: string;
};

type RawExercise = Omit<Exercise, "imageUrl"> & { image: string | null };

export const EXERCISE_LIBRARY: Exercise[] = (rawExercises as RawExercise[]).map(({ image, ...exercise }) => ({
  ...exercise,
  imageUrl: image ? `${EXERCISE_IMAGE_BASE}/${image}` : "",
}));

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISE_LIBRARY.map((exercise) => [exercise.id, exercise]),
);

export function formatMuscleName(muscle: string): string {
  return muscle.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Maps a friendly display name (e.g. from mock workout history) to a library exercise id. */
const EXERCISE_ID_BY_DISPLAY_NAME: Record<string, string> = {
  "Bench Press": "Barbell_Bench_Press_-_Medium_Grip",
  Deadlift: "Barbell_Deadlift",
  Squat: "Barbell_Squat",
  "Overhead Press": "Barbell_Shoulder_Press",
};

export function findExerciseByDisplayName(name: string): Exercise | undefined {
  const id = EXERCISE_ID_BY_DISPLAY_NAME[name];
  return id ? EXERCISE_BY_ID[id] : undefined;
}

export function searchExercises(query: string): Exercise[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return EXERCISE_LIBRARY;
  return EXERCISE_LIBRARY.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(trimmed) ||
      exercise.primaryMuscles.some((muscle) => muscle.toLowerCase().includes(trimmed)),
  );
}

/** Every distinct `equipment` value in the library, for building a picker in the create-exercise form. */
export const EXERCISE_EQUIPMENT_OPTIONS = Array.from(
  new Set(EXERCISE_LIBRARY.map((exercise) => exercise.equipment).filter((equipment): equipment is string => !!equipment)),
).sort();
