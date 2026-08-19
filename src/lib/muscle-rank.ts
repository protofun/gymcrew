import { ALL_MUSCLE_GROUPS, generateMemberWorkoutSessions, type MuscleGroup } from "@/data/workout-log";
import { DIVISIONS, type Division } from "@/lib/division";
import { memberStrengthProgress } from "@/lib/member-mock-profile";
import { calculateLiftRank, mockNameForMajorLift, mockProfileFor, MUSCLE_GROUP_MAJOR_LIFT, RANK_TIERS } from "@/lib/rank";
import { CURRENT_MEMBER_ID, type CrewMember } from "@/store/crew-store";

export type MuscleDivisionRank = { division: Division; divisionIndex: number };

/**
 * Curated for the demo/meme account specifically ("skips leg day", per the TikTok bit this profile
 * is built for) — deliberately spread across the top of the ladder per muscle group rather than
 * every upper-body muscle landing on the same tier, so the contrast against the legs (bottom of the
 * ladder) reads clearly at a glance. This is fixed, not computed from logged lifts.
 */
const MEME_MUSCLE_DIVISIONS: Record<MuscleGroup, Division> = {
  chest: "Apex",
  triceps: "Supreme",
  shoulders: "Conqueror",
  back: "Dominator",
  biceps: "Overlord",
  abs: "Legend",
  quads: "Rookie",
  hamstrings: "Rookie",
  calves: "Rookie",
  glutes: "Rookie",
};

function toRank(division: Division): MuscleDivisionRank {
  return { division, divisionIndex: DIVISIONS.indexOf(division) };
}

/**
 * A division per muscle group, for the member profile's muscle heatmap. The demo account gets its
 * curated meme spread (see above); everyone else gets a fair, computed rank — a bodyweight-relative
 * strength standard for whichever major lift trains that muscle hardest — mapped onto the same
 * ladder. RANK_TIERS is exactly the ladder's first 15 divisions in the same order, so the mapping is
 * 1:1 by position; nobody but the demo account reaches the top 5 (Overlord..Apex) yet.
 */
export function muscleGroupDivisions(member: CrewMember): Partial<Record<MuscleGroup, MuscleDivisionRank>> {
  if (member.id === CURRENT_MEMBER_ID) {
    return Object.fromEntries(
      (Object.entries(MEME_MUSCLE_DIVISIONS) as [MuscleGroup, Division][]).map(([group, division]) => [group, toRank(division)]),
    );
  }

  const profile = mockProfileFor(member.id);
  const mockStrength = memberStrengthProgress(generateMemberWorkoutSessions(member.id));

  const result: Partial<Record<MuscleGroup, MuscleDivisionRank>> = {};
  for (const group of ALL_MUSCLE_GROUPS) {
    const majorLift = MUSCLE_GROUP_MAJOR_LIFT[group];
    const points = mockStrength[mockNameForMajorLift(majorLift)] ?? [];
    if (points.length === 0) continue;

    const bestWeightKg = Math.max(...points.map((point) => point.value));
    const tier = calculateLiftRank(majorLift, bestWeightKg, profile);
    result[group] = toRank(DIVISIONS[RANK_TIERS.indexOf(tier)]);
  }
  return result;
}
