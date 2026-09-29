import { useWindowDimensions } from "react-native";

import { ShareFrame } from "@/components/ShareFrame";
import { Polaroid } from "@/components/ui/pieces/polaroid";
import { rankTierImages } from "@/constants/images";
import { formatRankTier, type RankTier } from "@/lib/rank";
import { colors } from "@/theme";

type PrShareCardProps = {
  tier: RankTier;
  exerciseName: string;
  weightKg: number;
  reps: number;
  unit: string;
  topPercent?: number | null;
  progressToNextTier?: number | null;
};

/** A single PR as a polaroid stuck up with tape (Reacticx `polaroid`) — the rank medal as the photo, the lift as the caption underneath.
 * This is the "share this one lift" picture (tap a PR row in the results screen's PRs tab); like the workout one it is captured whole, on
 * the share poster, and made of static pieces only. */
export function PrShareCard({ tier, exerciseName, weightKg, reps, unit, topPercent }: PrShareCardProps) {
  const { width } = useWindowDimensions();

  return (
    <ShareFrame>
      <Polaroid.Root width={Math.min(width - 112, 290)} tilt={-2.5} lift={0} palette={{ photo: colors.neutral.surface }}>
        <Polaroid.Tape />
        <Polaroid.Photo source={rankTierImages[tier]} aspectRatio={1} />
        <Polaroid.Footer>
          <Polaroid.Caption>{exerciseName}</Polaroid.Caption>
          <Polaroid.Meta>{`${weightKg}${unit} × ${reps} · ${formatRankTier(tier).toUpperCase()}${topPercent != null ? ` · TOP ${topPercent}%` : ""}`}</Polaroid.Meta>
        </Polaroid.Footer>
      </Polaroid.Root>
    </ShareFrame>
  );
}
