import type { ApiCrewMemberActivity } from "@/lib/api";
import { realCurrentWeekMuscleIntensity } from "@/lib/member-real-profile";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

/**
 * This week's raw training load per muscle group, summed across every crew member using each
 * member's real logged workouts — your own from workout-history-store, everyone else's from
 * `othersActivity` (see crew-activity-store.ts, backed by backend/routes/crews.php's
 * `/crews/:id/activity`). Every group in `ALL_MUSCLE_GROUPS` is always present, defaulting to 0,
 * so callers can tell "never trained this week" apart from "just not in the response." A crewmate
 * whose activity hasn't loaded yet (or who has none) simply contributes nothing, rather than
 * falling back to any fabricated data. Shared by `crewMuscleBalance` (the heatmap's normalized
 * view) and `mostNeglectedCrewMuscleGroup` (push-notifications.ts's weekly nudge) so both read the
 * exact same underlying totals.
 */
function crewMuscleGroupTotals(
  members: CrewMember[],
  myRealWorkouts: CompletedWorkout[],
  othersActivity: Record<string, ApiCrewMemberActivity>,
): Record<MuscleGroup, number> {
  const totals = Object.fromEntries(ALL_MUSCLE_GROUPS.map((group) => [group, 0])) as Record<MuscleGroup, number>;

  for (const member of members) {
    const workouts = member.id === CURRENT_MEMBER_ID ? myRealWorkouts : (othersActivity[member.id]?.recentWorkouts ?? []);
    const intensity = realCurrentWeekMuscleIntensity(workouts);

    for (const [group, value] of Object.entries(intensity) as [MuscleGroup, number][]) {
      totals[group] += value;
    }
  }

  return totals;
}

/**
 * This week's training load per muscle group, normalized so the crew's most-trained group always
 * reads as "high" — surfacing relative imbalance across the group rather than an absolute number
 * nobody has context for. Unlike `crewMuscleGroupTotals`, a group with zero training this week is
 * simply absent here (MuscleHeatmap only draws groups it's given), not present at 0.
 */
export function crewMuscleBalance(
  members: CrewMember[],
  myRealWorkouts: CompletedWorkout[],
  othersActivity: Record<string, ApiCrewMemberActivity> = {},
): Partial<Record<MuscleGroup, number>> {
  const totals = crewMuscleGroupTotals(members, myRealWorkouts, othersActivity);

  const max = Math.max(1, ...Object.values(totals));
  const normalized: Partial<Record<MuscleGroup, number>> = {};
  for (const [group, value] of Object.entries(totals) as [MuscleGroup, number][]) {
    if (value === 0) continue;
    normalized[group] = Math.max(1, Math.round((value / max) * 10));
  }
  return normalized;
}

/**
 * The crew's least-trained muscle group this week, only when it's a genuine *skip* — completely
 * untouched (zero total intensity across every member) while the crew trained meaningfully
 * elsewhere. Returns `null` when nothing qualifies: no real crew activity logged yet this week at
 * all (`max === 0`, nothing to compare against), or a genuinely balanced week where every group got
 * at least some attention — deliberately not "just whichever group has the lowest number," since
 * that would nudge about an evenly-trained week that happens to have a slightly lower number
 * somewhere. Ties (more than one untouched group) resolve to `ALL_MUSCLE_GROUPS`'s own order, so
 * this is stable and deterministic rather than picking differently each time it recomputes.
 */
export function mostNeglectedCrewMuscleGroup(
  members: CrewMember[],
  myRealWorkouts: CompletedWorkout[],
  othersActivity: Record<string, ApiCrewMemberActivity> = {},
): MuscleGroup | null {
  const totals = crewMuscleGroupTotals(members, myRealWorkouts, othersActivity);

  const max = Math.max(...Object.values(totals));
  if (max === 0) return null;

  return ALL_MUSCLE_GROUPS.find((group) => totals[group] === 0) ?? null;
}
