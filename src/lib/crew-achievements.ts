import { exerciseByIdWithCustom, type Exercise } from "@/data/exercises";
import type { ApiCrewMemberActivity } from "@/lib/api";
import { genericExerciseRankDetail } from "@/lib/generic-lift-rank";
import { realMemberAchievements } from "@/lib/member-real-profile";
import type { Achievement } from "@/lib/member-mock-profile";
import type { RankProfile, RankTier } from "@/lib/rank";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { Gender } from "@/store/onboarding-store";
import type { PersonalRecord } from "@/store/personal-records-store";

export type CrewAchievement = {
  member: CrewMember;
  achievement: Achievement;
  rankTier: RankTier;
};

/**
 * The single most recent PR across the whole crew, using every real member's actual personal
 * records — your own from personal-records-store, everyone else's from `othersActivity` (see
 * crew-activity-store.ts, backed by backend/routes/crews.php's `/crews/:id/activity`, which also
 * returns each member's real gender/bodyweight so their rank tier is calculated for real, not
 * assumed). Ranks the PR with the same generic-proxy engine the workout summary screen uses (any of
 * the 800+ exercises, not just the 4 major lifts) — falls back to "rookie" only when a rank
 * genuinely can't be calculated at all (that member's profile isn't filled in yet, or the exercise
 * is unrecognized), same "no data yet" convention used everywhere else.
 */
export function mostRecentCrewAchievement(
  members: CrewMember[],
  myRecords: Record<string, PersonalRecord>,
  myGender: Gender | undefined,
  myWeightKg: number | undefined,
  othersActivity: Record<string, ApiCrewMemberActivity>,
  myCustomExercises: Exercise[] = [],
): CrewAchievement | null {
  const candidates: { member: CrewMember; achievement: Achievement; profile: RankProfile | null; isMe: boolean }[] = [];

  for (const member of members) {
    const isMe = member.id === CURRENT_MEMBER_ID;
    const records = isMe ? myRecords : (othersActivity[member.id]?.records ?? {});
    const [latest] = realMemberAchievements(records, 1);
    if (!latest) continue;

    const gender = isMe ? myGender : (othersActivity[member.id]?.profile.gender ?? undefined);
    const weightKg = isMe ? myWeightKg : (othersActivity[member.id]?.profile.weightKg ?? undefined);
    const profile: RankProfile | null = gender && weightKg ? { gender, bodyWeightKg: weightKg } : null;

    candidates.push({ member, achievement: latest, profile, isMe });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.achievement.achievedAt - a.achievement.achievedAt);
  const top = candidates[0];

  // Custom exercises only resolve for the current user's own PR — a crewmate's custom exercises
  // aren't shared/synced data this function has access to.
  const exercise = top.isMe ? exerciseByIdWithCustom(top.achievement.id, myCustomExercises) : exerciseByIdWithCustom(top.achievement.id, []);
  const rankTier: RankTier =
    exercise && top.profile
      ? genericExerciseRankDetail(exercise, top.achievement.weightKg, top.achievement.reps, top.profile).tier
      : "rookie";

  return { member: top.member, achievement: top.achievement, rankTier };
}
