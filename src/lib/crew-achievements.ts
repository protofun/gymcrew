import type { ApiCrewMemberActivity } from "@/lib/api";
import { realMemberAchievements } from "@/lib/member-real-profile";
import type { Achievement } from "@/lib/member-mock-profile";
import { calculateLiftRank, majorLiftForExerciseId, type RankProfile, type RankTier } from "@/lib/rank";
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
 * assumed). Falls back to "gold" only when a rank genuinely can't be calculated (not one of the
 * four major lifts, or that member's profile isn't filled in yet) — same fallback the
 * PR-celebration screen already uses.
 */
export function mostRecentCrewAchievement(
  members: CrewMember[],
  myRecords: Record<string, PersonalRecord>,
  myGender: Gender | undefined,
  myWeightKg: number | undefined,
  othersActivity: Record<string, ApiCrewMemberActivity>,
): CrewAchievement | null {
  const candidates: { member: CrewMember; achievement: Achievement; profile: RankProfile | null }[] = [];

  for (const member of members) {
    const isMe = member.id === CURRENT_MEMBER_ID;
    const records = isMe ? myRecords : (othersActivity[member.id]?.records ?? {});
    const [latest] = realMemberAchievements(records, 1);
    if (!latest) continue;

    const gender = isMe ? myGender : (othersActivity[member.id]?.profile.gender ?? undefined);
    const weightKg = isMe ? myWeightKg : (othersActivity[member.id]?.profile.weightKg ?? undefined);
    const profile: RankProfile | null = gender && weightKg ? { gender, bodyWeightKg: weightKg } : null;

    candidates.push({ member, achievement: latest, profile });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.achievement.achievedAt - a.achievement.achievedAt);
  const top = candidates[0];

  const majorLift = majorLiftForExerciseId(top.achievement.id);
  const rankTier: RankTier = majorLift && top.profile ? calculateLiftRank(majorLift, top.achievement.weightKg, top.profile) : "gold";

  return { member: top.member, achievement: top.achievement, rankTier };
}
