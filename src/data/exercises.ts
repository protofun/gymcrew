/**
 * Exercise reference data — name, primary target muscle, and a demo photo.
 * Images come from free-exercise-db (github.com/yuhonas/free-exercise-db),
 * a public-domain (Unlicense) exercise database, served straight off
 * GitHub's raw CDN. No API key, no cost.
 */
const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export type ExerciseInfo = {
  name: string;
  targetMuscle: string;
  imageUrl: string;
};

export const EXERCISES: Record<string, ExerciseInfo> = {
  "Bench Press": {
    name: "Bench Press",
    targetMuscle: "Chest",
    imageUrl: `${EXERCISE_IMAGE_BASE}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`,
  },
  Deadlift: {
    name: "Deadlift",
    targetMuscle: "Lower Back",
    imageUrl: `${EXERCISE_IMAGE_BASE}/Barbell_Deadlift/0.jpg`,
  },
  Squat: {
    name: "Squat",
    targetMuscle: "Quadriceps",
    imageUrl: `${EXERCISE_IMAGE_BASE}/Barbell_Squat/0.jpg`,
  },
  "Overhead Press": {
    name: "Overhead Press",
    targetMuscle: "Shoulders",
    imageUrl: `${EXERCISE_IMAGE_BASE}/Barbell_Shoulder_Press/0.jpg`,
  },
};
