import { ShimmerEffect } from "@/components/ui/molecules/Shimmer/Shimmer";
import { colors } from "@/theme";

type SkeletonProps = {
  width: number | `${number}%`;
  height: number;
  radius?: number;
};

const SHIMMER_COLORS = [colors.neutral.divider, colors.neutral.surfaceElevated, colors.neutral.divider];

/**
 * A loading placeholder block — pair a few of these to sketch the shape of the real layout
 * underneath (see `HomeSkeleton`) instead of leaving a blank screen or a single centered spinner.
 *
 * Built on Reacticx's `ShimmerEffect` using its `"shimmer"` sweep (the primitive's own `"pulse"`
 * variant renders as a tinted overlay on top of a separate base color rather than one solid block
 * changing opacity, so it doesn't reduce cleanly to the flat pulse this component used before) —
 * `shimmerColors` are GymCrew's own `divider`/`surfaceElevated` tones so the sweep reads as an
 * on-brand highlight rather than the primitive's default generic gray.
 */
export function Skeleton({ width, height, radius = 8 }: SkeletonProps) {
  return (
    <ShimmerEffect
      style={{ width, height, borderRadius: radius, backgroundColor: colors.neutral.divider }}
      shimmerColors={SHIMMER_COLORS}
      preset="custom"
    />
  );
}
