import { generateMemberWorkoutSessions } from "@/data/workout-log";
import { memberAchievements, type Achievement } from "@/lib/member-mock-profile";
import { realMemberAchievements } from "@/lib/member-real-profile";
import {
  calculateLiftRank,
  majorLiftForExerciseId,
  mockProfileFor,
  MOCK_MAJOR_LIFT_NAME_TO_ID,
  type RankTier,
} from "@/lib/rank";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { Gender } from "@/store/onboarding-store";
import type { PersonalRecord } from "@/store/personal-records-store";

export type CrewAchievement = {
  member: CrewMember;
  achievement: Achievement;
  rankTier: RankTier;
};

/**
 * The single most recent PR across the whole crew (real data for the current user, seeded mock for
 * everyone else) — for the Overview's "Recent Achievement" spotlight card. Falls back to "gold" when
 * a rank can't be fairly calculated (not one of the four major lifts, or no profile to normalize
 * against), matching the same fallback the PR-celebration screen already uses.
 */
export function mostRecentCrewAchievement(
  members: CrewMember[],
  myRecords: Record<string, PersonalRecord>,
  myGender: Gender | undefined,
  myWeightKg: number | undefined,
): CrewAchievement | null {
  const candidates: { member: CrewMember; achievement: Achievement }[] = [];

  for (const member of members) {
    if (member.id === CURRENT_MEMBER_ID) {
      const [latest] = realMemberAchievements(myRecords, 1);
      if (latest) candidates.push({ member, achievement: latest });
    } else {
      const [latest] = memberAchievements(generateMemberWorkoutSessions(member.id), 1);
      if (latest) candidates.push({ member, achievement: latest });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.achievement.achievedAt - a.achievement.achievedAt);
  const top = candidates[0];
  const isMe = top.member.id === CURRENT_MEMBER_ID;

  const exerciseId = isMe ? top.achievement.id : MOCK_MAJOR_LIFT_NAME_TO_ID[top.achievement.exerciseName];
  const majorLift = exerciseId ? majorLiftForExerciseId(exerciseId) : null;
  const profile = isMe ? (myGender && myWeightKg ? { gender: myGender, bodyWeightKg: myWeightKg } : null) : mockProfileFor(top.member.id);

  const rankTier: RankTier = majorLift && profile ? calculateLiftRank(majorLift, top.achievement.weightKg, profile) : "gold";

  return { member: top.member, achievement: top.achievement, rankTier };
}
