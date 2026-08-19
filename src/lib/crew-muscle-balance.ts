import type { MuscleGroup } from "@/data/workout-log";
import { generateMemberWorkoutSessions } from "@/data/workout-log";
import { memberCurrentWeekMuscleIntensity } from "@/lib/member-mock-profile";
import { realCurrentWeekMuscleIntensity } from "@/lib/member-real-profile";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * This week's training load per muscle group, summed across every crew member (real data for the
 * current user, seeded mock history for the rest — see member-mock-profile.ts), then normalized so
 * the crew's most-trained group always reads as "high" — the point is to surface relative imbalance
 * across the group, not an absolute number nobody has context for.
 */
export function crewMuscleBalance(members: CrewMember[], myRealWorkouts: CompletedWorkout[]): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};

  for (const member of members) {
    const intensity =
      member.id === CURRENT_MEMBER_ID
        ? realCurrentWeekMuscleIntensity(myRealWorkouts)
        : memberCurrentWeekMuscleIntensity(generateMemberWorkoutSessions(member.id));

    for (const [group, value] of Object.entries(intensity) as [MuscleGroup, number][]) {
      totals[group] = (totals[group] ?? 0) + value;
    }
  }

  const max = Math.max(1, ...Object.values(totals));
  const normalized: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, value] of Object.entries(totals) as [MuscleGroup, number][]) {
    normalized[group] = Math.max(1, Math.round((value / max) * 10));
  }
  return normalized;
}
