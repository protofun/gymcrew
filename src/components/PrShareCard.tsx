import { RankRevealCard } from "@/components/RankRevealCard";
import type { RankTier } from "@/lib/rank";

type PrShareCardProps = {
  tier: RankTier;
  exerciseName: string;
  weightKg: number;
  reps: number;
  unit: string;
  topPercent?: number | null;
  progressToNextTier?: number | null;
};

/** A single PR, poster-style — the "share this one lift" card (tap a PR row in the results
 * screen's PRs tab). A thin wrapper around `RankRevealCard`, the same canonical medal-reveal card
 * "What's my rank?" and the PR celebration screen use — this should never grow its own, different
 * take on that layout. */
export function PrShareCard({ tier, exerciseName, weightKg, reps, unit, topPercent, progressToNextTier }: PrShareCardProps) {
  return (
    <RankRevealCard
      id={`workout.prShare.${exerciseName}`}
      name={exerciseName}
      tier={tier}
      weightKg={weightKg}
      reps={reps}
      unit={unit}
      topPercent={topPercent}
      progressToNextTier={progressToNextTier}
      triggerKey={`${tier}-${exerciseName}-${weightKg}`}
    />
  );
}
