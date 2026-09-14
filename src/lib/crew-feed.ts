import type { Ionicons } from "@expo/vector-icons";

import { EXERCISE_BY_NAME, exerciseByIdWithCustom, type Exercise } from "@/data/exercises";
import type { ApiCrewActivityEvent, ApiCrewMemberActivity, CrewActivityEventType } from "@/lib/api";
import { DIVISIONS, type Division } from "@/lib/division";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import type { RankTier } from "@/lib/rank";
import { colors } from "@/theme";

export const EVENT_ICON: Record<CrewActivityEventType, keyof typeof Ionicons.glyphMap> = {
  pr: "trophy",
  streak: "flame",
  long_session: "time",
  division_up: "ribbon",
};

export const EVENT_TINT: Record<CrewActivityEventType, string> = {
  pr: colors.brand.yellow,
  streak: colors.semantic.streak,
  long_session: colors.semantic.info,
  division_up: colors.semantic.success,
};

export const EVENT_TYPE_LABEL: Record<CrewActivityEventType, string> = {
  pr: "PRs",
  streak: "Streaks",
  long_session: "Long Sessions",
  division_up: "Division Ups",
};

export function describeEvent(event: ApiCrewActivityEvent, isMe: boolean): string {
  const who = isMe ? "You" : event.userName;
  switch (event.eventType) {
    case "pr": {
      const { exerciseName, weightKg, reps } = event.payload as { exerciseName: string; weightKg: number; reps: number };
      return `${who} hit a new PR — ${exerciseName} ${weightKg}kg × ${reps}`;
    }
    case "streak": {
      const { days } = event.payload as { days: number };
      return `${who} ${isMe ? "are" : "is"} on a ${days}-day streak`;
    }
    case "long_session": {
      const { durationMinutes, workoutName } = event.payload as { durationMinutes: number; workoutName: string };
      return `${who} just crushed a ${durationMinutes}-minute ${workoutName} session`;
    }
    case "division_up": {
      const { division } = event.payload as { division: string };
      return `${who} reached ${division}`;
    }
    default:
      return who;
  }
}

/** The real division the "reached X" event is for, if the payload holds a recognized division name
 * — used so the feed row can show the actual medal instead of a generic ribbon icon. */
export function divisionFromEvent(event: ApiCrewActivityEvent): Division | null {
  if (event.eventType !== "division_up") return null;
  const { division } = event.payload as { division: string };
  return (DIVISIONS as readonly string[]).includes(division) ? (division as Division) : null;
}

/**
 * The real rank tier a "pr" event's PR actually earned, same generic-proxy engine the workout
 * summary screen and notifications use — `null` when it can't be calculated (the crewmate's profile
 * hasn't loaded yet, or the exercise is unrecognized), in which case the feed row falls back to the
 * generic trophy icon rather than guessing. Checks the caller's own custom exercises too (see
 * `exerciseByIdWithCustom`) — otherwise a PR on a user-created exercise could never resolve, since
 * it's not in the built-in library at all. Events logged before `exerciseId` was added to the
 * payload fall back to an exact name lookup — `exerciseName` was always stored, and it's the
 * library's own display name, so this reliably recovers the same exercise for older events too
 * (custom exercises aren't covered by the name fallback, only by a real `exerciseId` match).
 */
export function tierForPrEvent(
  event: ApiCrewActivityEvent,
  isMe: boolean,
  myProfile: { gender?: "male" | "female"; weightKg?: number },
  membersActivity: Record<string, ApiCrewMemberActivity>,
  myCustomExercises: Exercise[],
): RankTier | null {
  if (event.eventType !== "pr") return null;
  const { exerciseId, exerciseName, weightKg, reps } = event.payload as {
    exerciseId?: string;
    exerciseName: string;
    weightKg: number;
    reps: number;
  };
  // Custom exercises are local to their creator — only resolvable for the current user's own PRs,
  // never a crewmate's (their custom exercise data isn't shared/synced across the crew).
  const exercise = exerciseId
    ? (isMe ? exerciseByIdWithCustom(exerciseId, myCustomExercises) : exerciseByIdWithCustom(exerciseId, []))
    : EXERCISE_BY_NAME[exerciseName];
  if (!exercise) return null;

  const gender = isMe ? myProfile.gender : (membersActivity[event.userId]?.profile.gender ?? undefined);
  const bodyWeightKg = isMe ? myProfile.weightKg : (membersActivity[event.userId]?.profile.weightKg ?? undefined);
  if (!gender || !bodyWeightKg) return null;

  return genericExerciseRankDetail(exercise, weightKg, reps, { gender, bodyWeightKg }).tier;
}
