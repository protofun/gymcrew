import { generateMemberWorkoutSessions } from "@/data/workout-log";
import { MAJOR_LIFT_CARDS, SEEDED_LIFT_CARDS, type LiftCardId } from "@/data/rank-lifts";
import { toDateKey } from "@/lib/date";
import { gymStandingForCard, type LiftRankCard } from "@/lib/lift-rank-cards";
import { memberStrengthProgress } from "@/lib/member-mock-profile";
import {
  calculateLiftRankDetail,
  mockNameForMajorLift,
  mockProfileFor,
  RANK_TIERS,
  type MajorLift,
  type RankProfile,
  type RankTier,
} from "@/lib/rank";
import { BRO_MEMBER_ID, CURRENT_MEMBER_ID, LEE_PRIEST_MEMBER_ID, type CrewMember } from "@/store/crew-store";

export type CrewLiftStanding = {
  id: string;
  name: string;
  avatarUrl: string;
  isMe: boolean;
  weightKg: number;
  tier: RankTier;
  percentileInTier: number;
  score: number;
  daysSinceLogged: number;
};

/** Matches lib/lift-rank-cards.ts's score formula, so crew and personal scores stay comparable. */
const SCORE_PER_BODYWEIGHT_RATIO = 4000;

/**
 * Lee Priest — added as a "boss" crew member with curated numbers clear of the current user's own
 * on every tracked lift, so there's always someone worth comparing against. Real profile + weights
 * instead of the generic per-member mock, so his card is deliberately, consistently maxed out rather
 * than landing on Legend by formula coincidence.
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
};

const CURATED_MEMBER_IDS = new Set([LEE_PRIEST_ID, BRO_ID]);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function profileForCrewMember(memberId: string): RankProfile {
  if (memberId === LEE_PRIEST_ID) return LEE_PRIEST_PROFILE;
  if (memberId === BRO_ID) return BRO_PROFILE;
  return mockProfileFor(memberId);
}

function weightForCrewMember(liftId: LiftCardId, memberId: string, myWeightKg: number): number {
  if (memberId === LEE_PRIEST_ID) return LEE_PRIEST_LIFTS_KG[liftId];
  if (memberId === BRO_ID) return BRO_LIFTS_KG[liftId];

  const majorLift = MAJOR_LIFT_CARDS.find((lift) => lift.id === liftId)?.majorLift;
  if (majorLift) {
    const points = memberStrengthProgress(generateMemberWorkoutSessions(memberId))[mockNameForMajorLift(majorLift)] ?? [];
    if (points.length > 0) return Math.max(...points.map((point) => point.value));
  }
  // No strength standard (or no mock session history) for this lift — a deterministic jitter around
  // the user's own best keeps every crew member's number stable and plausible without a real dataset.
  const hash = hashString(`${liftId}-${memberId}`);
  return Math.round(myWeightKg * (0.82 + (hash % 40) / 100));
}

/** The major lift to rank `liftId` against for `memberId` — the real one for the 4 major lifts, a
 * proxy for seeded lifts but only for curated members (see SEEDED_LIFT_PROXY_MAJOR_LIFT above). */
function majorLiftFor(liftId: LiftCardId, memberId: string): MajorLift | undefined {
  return MAJOR_LIFT_CARDS.find((lift) => lift.id === liftId)?.majorLift ?? (CURATED_MEMBER_IDS.has(memberId) ? SEEDED_LIFT_PROXY_MAJOR_LIFT[liftId] : undefined);
}

/** Where every other crew member (mocked, except Lee Priest's curated numbers) and "me" (real)
 * stand on one specific lift, heaviest first — powers the lift detail page's "In your crew" list
 * and the compare screen. */
export function crewLiftStandings(liftId: LiftCardId, myCard: LiftRankCard, crewMembers: CrewMember[]): CrewLiftStanding[] {
  const me = crewMembers.find((member) => member.id === CURRENT_MEMBER_ID);

  const standings: CrewLiftStanding[] = crewMembers
    .filter((member) => member.id !== CURRENT_MEMBER_ID)
    .map((member) => {
      // Lee Priest is always Legend regardless, by design — everyone else (including Bro) gets a
      // real computed tier off their (possibly curated) weight.
      const isLeePriest = member.id === LEE_PRIEST_ID;
      const weightKg = weightForCrewMember(liftId, member.id, myCard.bestWeightKg);
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
        // No standard to rank teammates against for a non-curated member's seeded lifts —
        // approximating at "my" tier keeps the comparison visually sane rather than defaulting
        // everyone to Rookie.
        tier: isLeePriest ? "legend" : (detail?.tier ?? myCard.tier),
        percentileInTier: isLeePriest ? 0.99 : (detail?.progressToNextTier ?? myCard.percentileInTier),
        score,
        daysSinceLogged: 1 + (hashString(`${liftId}-${member.id}-logged`) % 6),
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
    daysSinceLogged: 2,
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

/** A full 9-lift card set for any crew member (not "me") — same shape lib/lift-rank-cards.ts builds
 * for the current user, so it can feed the same consumers (e.g. computeMuscleGroupRanks) to show
 * another member's own rank overview / body graph. */
export function memberLiftCards(memberId: string, myCards: LiftRankCard[]): LiftRankCard[] {
  const myCardById = new Map(myCards.map((card) => [card.id, card]));
  const isLeePriest = memberId === LEE_PRIEST_ID;
  const memberProfile = profileForCrewMember(memberId);

  return [...MAJOR_LIFT_CARDS, ...SEEDED_LIFT_CARDS].map((def) => {
    const myCard = myCardById.get(def.id);
    const weightKg = weightForCrewMember(def.id, memberId, myCard?.bestWeightKg ?? 0);
    const majorLift = majorLiftFor(def.id, memberId);
    const detail = majorLift ? calculateLiftRankDetail(majorLift, weightKg, memberProfile) : null;
    const score = Math.round((weightKg / memberProfile.bodyWeightKg) * SCORE_PER_BODYWEIGHT_RATIO);
    const tier = isLeePriest ? "legend" : (detail?.tier ?? myCard?.tier ?? "rookie");
    const percentileInTier = isLeePriest ? 0.99 : (detail?.progressToNextTier ?? myCard?.percentileInTier ?? 0);
    const { gymRank, gymPoolSize } = gymStandingForCard(def.id, RANK_TIERS.indexOf(tier), percentileInTier);

    return {
      id: def.id,
      name: def.name,
      image: def.image,
      exerciseId: def.exerciseId,
      tier,
      score,
      percentileInTier,
      gymRank,
      gymPoolSize,
      prDeltaKg: def.prDeltaKg,
      isWeakPoint: false, // "lagging behind your OWN other lifts" doesn't apply cross-member
      bestWeightKg: weightKg,
      bestReps: 5,
      kgToNextTier: null,
    };
  });
}

export type PairedProgressionPoint = { date: string; mineKg: number; theirsKg: number };

const COMPARE_CHART_POINTS = 6;
const COMPARE_CHART_SPAN_DAYS = 120; // ~4 months, evenly spaced

/**
 * A deterministic, illustrative pair of growth curves for the compare screen's trend chart, both
 * ending at each person's actual current best — there's no real logged history to plot for most
 * lift/person combinations (the 5 seeded lifts have no strength standard, and other crew members'
 * numbers are mocked or, for Lee Priest, curated constants), so this generates a plausible shared
 * timeline rather than mixing real and fabricated dates.
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
