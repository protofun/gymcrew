import { EXERCISE_BY_ID } from "@/data/exercises";
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from "@/data/workout-log";
import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import type { ApiCrewMemberActivity } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { buildLiftRankCards, gymStandingForCard, type LiftRankCard } from "@/lib/lift-rank-cards";
import { computeMuscleGroupRanks, type MuscleGroupRank } from "@/lib/muscle-group-rank";
import { calculateLiftRankDetail, RANK_TIERS, type MajorLift, type RankProfile, type RankTier } from "@/lib/rank";
import { BRO_MEMBER_ID, CURRENT_MEMBER_ID, GLUTE_ONLY_MEMBER_ID, LEE_PRIEST_MEMBER_ID, type CrewMember } from "@/store/crew-store";
import type { PersonalRecord } from "@/store/personal-records-store";

export type CrewLiftStanding = {
  id: string;
  name: string;
  avatarUrl: string;
  isMe: boolean;
  weightKg: number;
  tier: RankTier;
  percentileInTier: number;
  score: number;
  /** `null` when this person has never logged this lift — never a fabricated placeholder. */
  daysSinceLogged: number | null;
};

/** Matches lib/lift-rank-cards.ts's score formula, so crew and personal scores stay comparable. */
const SCORE_PER_BODYWEIGHT_RATIO = 4000;

/**
 * Lee Priest — added as a "boss" crew member with curated numbers clear of the current user's own
 * on every tracked lift, so there's always someone worth comparing against. Real profile + weights
 * instead of a real crewmate's own data, so his card is deliberately, consistently maxed out rather
 * than landing on Legend by formula coincidence. A real Clerk account is never one of these three
 * curated ids (see crew-store.ts) — they only ever appear via an explicit Developer Mode demo tool.
 */
const LEE_PRIEST_ID = LEE_PRIEST_MEMBER_ID;
const LEE_PRIEST_PROFILE: RankProfile = { gender: "male", bodyWeightKg: 95, age: 54 };
const LEE_PRIEST_LIFTS_KG: Record<LiftCardId, number> = {
  benchPress: 230,
  squat: 310,
  deadlift: 350,
  overheadPress: 150,
  pullUp: 55,
  seatedRow: 140,
  inclinePress: 160,
  legPress: 320,
  lunge: 90,
  barbellCurl: 70,
  cableCrunch: 55,
  calfRaise: 130,
};

/**
 * "Bro" — a curated meme member built for a TikTok bit: glutes trained to the exclusion of
 * everything else. Squat/deadlift/lunge (the 3 lifts glutes' composite draws from — see
 * MUSCLE_GROUP_WEIGHTS in muscle-group-rank.ts) are maxed out; every push/pull lift is deliberately
 * weak. Back and quads unavoidably ride along partway since they share deadlift/squat with glutes —
 * there's no clean way to isolate "only glutes" given the weighted-composite system, so this gets as
 * close as that structure allows.
 */
const BRO_ID = BRO_MEMBER_ID;
const BRO_PROFILE: RankProfile = { gender: "male", bodyWeightKg: 78, age: 22 };
const BRO_LIFTS_KG: Record<LiftCardId, number> = {
  benchPress: 30,
  squat: 280,
  deadlift: 300,
  overheadPress: 15,
  pullUp: 10,
  seatedRow: 20,
  inclinePress: 25,
  legPress: 50,
  lunge: 170,
  barbellCurl: 12,
  cableCrunch: 8,
  calfRaise: 20,
};

/** Curated members (Lee Priest, Bro) get a real computed tier for the 5 seeded lifts too, instead of
 * the generic per-member fallback (which just mirrors "my" own tier — fine for an anonymous mocked
 * teammate, not fine for a member whose whole point is a deliberately lopsided profile). Reuses
 * whichever major lift trains roughly the same area, same spirit as generic-lift-rank.ts's proxy. */
const SEEDED_LIFT_PROXY_MAJOR_LIFT: Partial<Record<LiftCardId, MajorLift>> = {
  pullUp: "deadlift",
  seatedRow: "deadlift",
  inclinePress: "benchPress",
  legPress: "squat",
  lunge: "squat",
  barbellCurl: "deadlift",
  cableCrunch: "squat",
  calfRaise: "squat",
};

/**
 * "Peach" — a second, more extreme glutes-only meme member. Bro's quads/back inevitably ride along
 * partway with glutes since they share squat/deadlift in the weighted-composite formula (see the
 * comment on Bro above) — there's no way to give him a literal Rookie everywhere-but-glutes using
 * that formula. Peach's underlying lift numbers follow the same "glute lifts maxed, everything else
 * minimal" spirit for her individual lift cards (Ranks tab, lift standings), but her muscle-GROUP
 * rank (the body-graph heatmap) is a hard override below rather than computed — the only way to get
 * a genuinely isolated "glutes: top tier, everything else: Rookie" result.
 */
const PEACH_ID = GLUTE_ONLY_MEMBER_ID;
const PEACH_PROFILE: RankProfile = { gender: "female", bodyWeightKg: 60, age: 26 };
const PEACH_LIFTS_KG: Record<LiftCardId, number> = {
  benchPress: 15,
  squat: 165,
  deadlift: 175,
  overheadPress: 8,
  pullUp: 2,
  seatedRow: 12,
  inclinePress: 10,
  legPress: 45,
  lunge: 110,
  barbellCurl: 5,
  cableCrunch: 5,
  calfRaise: 15,
};

/** Every muscle group forced to Rookie except glutes, which is forced to the top tier — see the
 * comment on Peach above for why this can't be the normal computed composite. */
const PEACH_MUSCLE_OVERRIDE: Partial<Record<MuscleGroup, MuscleGroupRank>> = Object.fromEntries(
  ALL_MUSCLE_GROUPS.map((group) => [
    group,
    group === "glutes"
      ? { status: "ranked", tier: "immortal", tierIndex: RANK_TIERS.indexOf("immortal"), contributingLifts: [] }
      : { status: "ranked", tier: "rookie", tierIndex: 0, contributingLifts: [] },
  ]),
);

const CURATED_MEMBER_IDS = new Set([LEE_PRIEST_ID, BRO_ID, PEACH_ID]);

function isCuratedMember(memberId: string): boolean {
  return CURATED_MEMBER_IDS.has(memberId);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/** A curated member's fixed profile — only ever called for one of the 3 curated ids above. */
export function profileForCrewMember(memberId: string): RankProfile {
  if (memberId === LEE_PRIEST_ID) return LEE_PRIEST_PROFILE;
  if (memberId === BRO_ID) return BRO_PROFILE;
  return PEACH_PROFILE;
}

function curatedWeightForMember(liftId: LiftCardId, memberId: string): number {
  if (memberId === LEE_PRIEST_ID) return LEE_PRIEST_LIFTS_KG[liftId];
  if (memberId === BRO_ID) return BRO_LIFTS_KG[liftId];
  return PEACH_LIFTS_KG[liftId];
}

/** The major lift to rank `liftId` against for a curated member's seeded lifts (see
 * SEEDED_LIFT_PROXY_MAJOR_LIFT above) — the real one for the 4 major lifts either way. */
function majorLiftFor(liftId: LiftCardId, memberId: string): MajorLift | undefined {
  return MAJOR_LIFT_CARDS.find((lift) => lift.id === liftId)?.majorLift ?? (isCuratedMember(memberId) ? SEEDED_LIFT_PROXY_MAJOR_LIFT[liftId] : undefined);
}

/** A real crewmate's real gender/bodyweight (see backend/routes/crews.php's `/crews/:id/activity`),
 * or a neutral placeholder while it's still loading. */
function realProfileFor(memberId: string, othersActivity: Record<string, ApiCrewMemberActivity>): RankProfile {
  const profile = othersActivity[memberId]?.profile;
  return { gender: profile?.gender ?? "male", bodyWeightKg: profile?.weightKg ?? 85 };
}

/** A real crewmate's full lift-card set, computed from their real personal records — the exact same
 * function/formula "my" cards use (see lib/lift-rank-cards.ts), never a mock generator. */
function realCardsFor(memberId: string, othersActivity: Record<string, ApiCrewMemberActivity>): LiftRankCard[] {
  const records = othersActivity[memberId]?.records ?? {};
  return buildLiftRankCards(records, realProfileFor(memberId, othersActivity), "gym");
}

/** Where every other crew member and "me" stand on one specific lift, heaviest first — powers the
 * lift detail page's "In your crew" list and the compare screen. Real crewmates use their real
 * records (via `othersActivity`, see crew-activity-store.ts); the 3 curated "boss" members keep
 * their fixed numbers. */
export function crewLiftStandings(
  liftId: LiftCardId,
  myCard: LiftRankCard,
  myRecord: PersonalRecord | undefined,
  crewMembers: CrewMember[],
  othersActivity: Record<string, ApiCrewMemberActivity>,
): CrewLiftStanding[] {
  const me = crewMembers.find((member) => member.id === CURRENT_MEMBER_ID);

  const standings: CrewLiftStanding[] = crewMembers
    .filter((member) => member.id !== CURRENT_MEMBER_ID)
    .map((member) => {
      if (isCuratedMember(member.id)) {
        // Lee Priest is always Legend regardless, by design — everyone else (including Bro) gets a
        // real computed tier off their curated weight.
        const isLeePriest = member.id === LEE_PRIEST_ID;
        const weightKg = curatedWeightForMember(liftId, member.id);
        const memberProfile = profileForCrewMember(member.id);
        const majorLift = majorLiftFor(liftId, member.id);
        const detail = majorLift ? calculateLiftRankDetail(majorLift, weightKg, memberProfile) : null;
        const score = Math.round((weightKg / memberProfile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
        return {
          id: member.id,
          name: member.name,
          avatarUrl: member.avatarUrl,
          isMe: false,
          weightKg,
          tier: isLeePriest ? ("legend" as RankTier) : (detail?.tier ?? myCard.tier),
          percentileInTier: isLeePriest ? 0.99 : (detail?.progressToNextTier ?? myCard.percentileInTier),
          score,
          daysSinceLogged: 1 + (hashString(`${liftId}-${member.id}-logged`) % 6),
        };
      }

      const theirCard = realCardsFor(member.id, othersActivity).find((card) => card.id === liftId);
      const theirRecord = theirCard ? othersActivity[member.id]?.records[theirCard.exerciseId] : undefined;
      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        isMe: false,
        weightKg: theirCard?.bestWeightKg ?? 0,
        tier: theirCard?.tier ?? "rookie",
        percentileInTier: theirCard?.percentileInTier ?? 0,
        score: theirCard?.score ?? 0,
        daysSinceLogged: theirRecord ? Math.floor((Date.now() - theirRecord.achievedAt) / 86400000) : null,
      };
    });

  standings.push({
    id: CURRENT_MEMBER_ID,
    name: me?.name ?? "You",
    avatarUrl: me?.avatarUrl ?? "",
    isMe: true,
    weightKg: myCard.bestWeightKg,
    tier: myCard.tier,
    percentileInTier: myCard.percentileInTier,
    score: myCard.score,
    daysSinceLogged: myRecord ? Math.floor((Date.now() - myRecord.achievedAt) / 86400000) : null,
  });

  return standings.sort((a, b) => b.weightKg - a.weightKg);
}

/** The crew member closest in weight to "me" on this lift — the default compare opponent. */
export function nearestRival(standings: CrewLiftStanding[]): CrewLiftStanding | null {
  const me = standings.find((standing) => standing.isMe);
  if (!me) return null;
  const others = standings.filter((standing) => !standing.isMe);
  if (others.length === 0) return null;
  return others.reduce((closest, candidate) =>
    Math.abs(candidate.weightKg - me.weightKg) < Math.abs(closest.weightKg - me.weightKg) ? candidate : closest,
  );
}

/** A full lift-card set for any crew member (not "me") — same shape lib/lift-rank-cards.ts builds
 * for the current user, so it can feed the same consumers (e.g. computeMuscleGroupRanks) to show
 * another member's own rank overview / body graph. Real crewmates get their real cards; the 3
 * curated "boss" members keep their fixed numbers. */
export function memberLiftCards(
  memberId: string,
  myCards: LiftRankCard[],
  othersActivity: Record<string, ApiCrewMemberActivity>,
): LiftRankCard[] {
  if (!isCuratedMember(memberId)) return realCardsFor(memberId, othersActivity);

  const myCardById = new Map(myCards.map((card) => [card.id, card]));
  const isLeePriest = memberId === LEE_PRIEST_ID;
  const memberProfile = profileForCrewMember(memberId);

  return [...MAJOR_LIFT_CARDS, ...SEEDED_LIFT_CARDS].map((def) => {
    const myCard = myCardById.get(def.id);
    const weightKg = curatedWeightForMember(def.id, memberId);
    const majorLift = majorLiftFor(def.id, memberId);
    const detail = majorLift ? calculateLiftRankDetail(majorLift, weightKg, memberProfile) : null;
    const score = Math.round((weightKg / memberProfile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    const tier = isLeePriest ? "legend" : (detail?.tier ?? myCard?.tier ?? "rookie");
    const percentileInTier = isLeePriest ? 0.99 : (detail?.progressToNextTier ?? myCard?.percentileInTier ?? 0);
    const { gymRank, gymPoolSize } = gymStandingForCard(def.id, RANK_TIERS.indexOf(tier), percentileInTier);

    return {
      id: def.id,
      // Real exercise-library name, same as lib/lift-rank-cards.ts — see data/rank-lifts.ts's
      // doc comment for why it's never duplicated as a field on `def` itself.
      name: EXERCISE_BY_ID[def.exerciseId]?.name ?? def.exerciseId,
      image: def.image,
      exerciseId: def.exerciseId,
      tier,
      score,
      percentileInTier,
      gymRank,
      gymPoolSize,
      prDeltaKg: null,
      isWeakPoint: false, // "lagging behind your OWN other lifts" doesn't apply cross-member
      bestWeightKg: weightKg,
      bestReps: 5,
      kgToNextTier: null,
    };
  });
}

/** Muscle-group ranks for any crew member (not "me") — Peach's hard override (see above) if it's
 * her, otherwise the normal weighted-composite formula off her/his lift cards (real for a real
 * crewmate). Exported so every consumer of a crew member's muscle rank (the member profile Stats
 * tab, the full body-graph page) shows the same result instead of each re-deciding whether to
 * special-case her. */
export function muscleGroupRanksForCrewMember(
  memberId: string,
  myCards: LiftRankCard[],
  othersActivity: Record<string, ApiCrewMemberActivity>,
): Partial<Record<MuscleGroup, MuscleGroupRank>> {
  if (memberId === PEACH_ID) return PEACH_MUSCLE_OVERRIDE;
  return computeMuscleGroupRanks(memberLiftCards(memberId, myCards, othersActivity));
}

export type PairedProgressionPoint = { date: string; mineKg: number; theirsKg: number };

const COMPARE_CHART_POINTS = 6;
const COMPARE_CHART_SPAN_DAYS = 120; // ~4 months, evenly spaced

/**
 * A pair of growth curves for the compare screen's trend chart, both ending at each person's
 * actual current best (real for a real crewmate, curated for a "boss" member) — there's no
 * per-day PR history logged yet (personal-records-store only keeps the current best, not a log of
 * previous ones — see backend/db/schema.sql's `personal_records` table), so the path leading up to
 * today is a plausible interpolated curve rather than a real timeline. The endpoints are always
 * real; only the shape of the climb between "4 months ago" and "now" is illustrative.
 */
export function pairedProgressionHistory(
  liftId: LiftCardId,
  myWeightKg: number,
  opponentId: string,
  opponentWeightKg: number,
): PairedProgressionPoint[] {
  const now = Date.now();
  const myStartRatio = 0.6 + (hashString(`me-${liftId}`) % 15) / 100; // starts ~60-75% of current, ~4 months ago
  const theirStartRatio = 0.6 + (hashString(`${opponentId}-${liftId}`) % 15) / 100;

  return Array.from({ length: COMPARE_CHART_POINTS }, (_, i) => {
    const t = i / (COMPARE_CHART_POINTS - 1);
    const isLast = i === COMPARE_CHART_POINTS - 1;
    const myJitter = isLast ? 0 : (hashString(`me-${liftId}-${i}`) % 5) - 2;
    const theirJitter = isLast ? 0 : (hashString(`${opponentId}-${liftId}-${i}`) % 5) - 2;
    const mineKg = Math.max(1, Math.round(myWeightKg * (myStartRatio + (1 - myStartRatio) * t) + myJitter));
    const theirsKg = Math.max(1, Math.round(opponentWeightKg * (theirStartRatio + (1 - theirStartRatio) * t) + theirJitter));
    const daysAgo = Math.round(COMPARE_CHART_SPAN_DAYS * (1 - t));
    return { date: toDateKey(new Date(now - daysAgo * 86400000)), mineKg, theirsKg };
  });
}
