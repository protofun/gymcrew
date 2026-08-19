import type { ImageSourcePropType } from "react-native";

import type { ChallengeMetric } from "@/data/challenges";
import type { MuscleGroup } from "@/data/workout-log";
import { exerciseImages, images } from "@/constants/images";

// Every challenge gets a themed hero photo — the gorilla mascot mid-lift for named exercises,
// the closest matching lift for a muscle-group challenge, and the flexing mascot for crew-wide
// totals. This is what gives the challenge list/detail its "gym poster" energy instead of a bare icon.
const EXERCISE_HERO_IMAGE: Record<string, ImageSourcePropType> = {
  "Barbell_Bench_Press_-_Medium_Grip": exerciseImages.benchPress,
  Barbell_Squat: exerciseImages.squat,
  Bodyweight_Squat: exerciseImages.squat,
  Barbell_Deadlift: exerciseImages.deadlift,
  Barbell_Shoulder_Press: exerciseImages.shoulderPress,
  Bent_Over_Barbell_Row: exerciseImages.seatedRow,
  Barbell_Curl: exerciseImages.barbellCurl,
  "Wide-Grip_Lat_Pulldown": exerciseImages.latPulldown,
  Leg_Press: exerciseImages.legPress,
  Barbell_Hip_Thrust: exerciseImages.squat,
  Standing_Calf_Raises: exerciseImages.calfRaise,
  "Push-Up_Wide": exerciseImages.tricepDips,
  Pullups: exerciseImages.pullUp,
  "Sit-Up": exerciseImages.absCrunch,
  Mountain_Climbers: exerciseImages.plank,
  "Dips_-_Triceps_Version": exerciseImages.tricepDips,
};

const MUSCLE_HERO_IMAGE: Record<MuscleGroup, ImageSourcePropType> = {
  chest: exerciseImages.benchPress,
  back: exerciseImages.seatedRow,
  shoulders: exerciseImages.shoulderPress,
  biceps: exerciseImages.barbellCurl,
  triceps: exerciseImages.tricepDips,
  abs: exerciseImages.absCrunch,
  quads: exerciseImages.squat,
  hamstrings: exerciseImages.legCurl,
  calves: exerciseImages.calfRaise,
  glutes: exerciseImages.squat,
};

export function challengeHeroImage(metric: ChallengeMetric): ImageSourcePropType {
  if (metric.type === "exerciseVolume" || metric.type === "exerciseReps") {
    return EXERCISE_HERO_IMAGE[metric.exerciseId] ?? images.mascotFlexing;
  }
  if (metric.type === "muscleVolume") {
    return MUSCLE_HERO_IMAGE[metric.muscleGroup];
  }
  return images.mascotFlexing;
}
