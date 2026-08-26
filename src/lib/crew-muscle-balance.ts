import type { ApiCrewMemberActivity } from "@/lib/api";
import { realCurrentWeekMuscleIntensity } from "@/lib/member-real-profile";
import type { MuscleGroup } from "@/data/workout-log";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * This week's training load per muscle group, summed across every crew member using each
 * member's real logged workouts — your own from workout-history-store, everyone else's from
 * `othersActivity` (see crew-activity-store.ts, backed by backend/routes/crews.php's
 * `/crews/:id/activity`) — then normalized so the crew's most-trained group always reads as
 * "high", surfacing relative imbalance across the group rather than an absolute number nobody has
 * context for. A crewmate whose activity hasn't loaded yet (or who has none) simply contributes
 * nothing, rather than falling back to any fabricated data.
 */
export function crewMuscleBalance(
  members: CrewMember[],
  myRealWorkouts: CompletedWorkout[],
  othersActivity: Record<string, ApiCrewMemberActivity> = {},
): Partial<Record<MuscleGroup, number>> {
  const totals: Partial<Record<MuscleGroup, number>> = {};

  for (const member of members) {
    const workouts = member.id === CURRENT_MEMBER_ID ? myRealWorkouts : (othersActivity[member.id]?.recentWorkouts ?? []);
    const intensity = realCurrentWeekMuscleIntensity(workouts);

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
