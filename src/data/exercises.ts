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

/** Exact library display-name lookup — e.g. recovering the exercise behind an older stored payload
 * that only kept the name, not the id (not to be confused with `findExerciseByDisplayName` below,
 * which maps a handful of mock-data-only names, not real library names). */
export const EXERCISE_BY_NAME: Record<string, Exercise> = Object.fromEntries(
  EXERCISE_LIBRARY.map((exercise) => [exercise.name, exercise]),
);

/** `EXERCISE_BY_ID` only covers the ~870 built-in library exercises — a PR logged against a
 * user-created exercise (see custom-exercises-store.ts, id `custom-<timestamp>`) needs its id
 * checked there too, or every tier lookup for it silently fails. Pass the caller's own
 * `useCustomExercisesStore().exercises`. */
export function exerciseByIdWithCustom(id: string, customExercises: Exercise[]): Exercise | undefined {
  return EXERCISE_BY_ID[id] ?? customExercises.find((exercise) => exercise.id === id);
}

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

export type ExerciseSearchFilters = {
  equipment?: string[];
  muscles?: string[];
};

function matchesFilters(exercise: Exercise, filters: ExerciseSearchFilters | undefined): boolean {
  if (filters?.equipment?.length && !(exercise.equipment && filters.equipment.includes(exercise.equipment))) return false;
  if (filters?.muscles?.length && !exercise.primaryMuscles.some((muscle) => filters.muscles!.includes(muscle))) return false;
  return true;
}

/** Word-based, not exact-substring — "niet exact 1 op 1 over moet komen maar ook gehusseld mag
 * zijn": splitting the query into words and requiring each one to appear SOMEWHERE in the name/
 * muscles/equipment (any order) means "press bench" finds "Barbell Bench Press" just as well as
 * "bench press" does, not just a query that happens to match the name's own word order.
 * `list` defaults to the built-in library but takes the picker's own combined (custom + library)
 * list too, so the same word-matching and equipment/muscle filters apply uniformly to both. */
export function searchExercises(query: string, filters?: ExerciseSearchFilters, list: Exercise[] = EXERCISE_LIBRARY): Exercise[] {
  const base = filters ? list.filter((exercise) => matchesFilters(exercise, filters)) : list;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return base;
  return base.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.primaryMuscles.join(" ")} ${exercise.equipment ?? ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** Every distinct `equipment` value in the library, for building a picker in the create-exercise form
 * and the exercise picker's equipment filter. */
export const EXERCISE_EQUIPMENT_OPTIONS = Array.from(
  new Set(EXERCISE_LIBRARY.map((exercise) => exercise.equipment).filter((equipment): equipment is string => !!equipment)),
).sort();

/** Every distinct primary-muscle value in the library, for the exercise picker's muscle-group filter. */
export const EXERCISE_MUSCLE_OPTIONS = Array.from(new Set(EXERCISE_LIBRARY.flatMap((exercise) => exercise.primaryMuscles))).sort();
