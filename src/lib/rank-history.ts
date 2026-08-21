import { RANK_TIERS, type RankTier } from "@/lib/rank";

export type RankHistoryEntry = {
  tier: RankTier;
  achievedAt: number;
  weightKg: number;
};

const CLIMB_SPAN_DAYS = 365;

/**
 * A rank-up timeline for one lift, newest first — one entry per tier already reached, from the
 * current tier down to Rookie. personal-records-store only keeps a lift's current best (not a
 * history of every past PR), so this interpolates a plausible climb between a starting weight and
 * the current best rather than reading real historical data — illustrative until PR history is
 * tracked over time. Takes just the two fields it needs (not the full `LiftRankCard`) so it works
 * for any exercise, not just the 9 tracked lifts.
 */
export function rankHistoryForCard(card: { tier: RankTier; bestWeightKg: number }): RankHistoryEntry[] {
  const currentIndex = RANK_TIERS.indexOf(card.tier);
  const tiers = RANK_TIERS.slice(0, currentIndex + 1); // Rookie .. current tier, ascending
  const startWeightKg = Math.max(1, Math.round(card.bestWeightKg * 0.5));
  const now = Date.now();

  return tiers
    .map((tier, index) => {
      const progress = tiers.length > 1 ? index / (tiers.length - 1) : 1;
      const weightKg = Math.round(startWeightKg + (card.bestWeightKg - startWeightKg) * progress);
      const daysAgo = Math.round(CLIMB_SPAN_DAYS * (1 - progress));
      return { tier, achievedAt: now - daysAgo * 86400000, weightKg };
    })
    .reverse(); // newest (current tier) first, matching the timeline UI
}
