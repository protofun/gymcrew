import type { ReactNode } from "react";

import { GradientBorder } from "@/components/GradientBorder";
import { colors } from "@/theme";

const BEAM: [string, string] = [colors.brand.yellow, "#FFF6C2"];

/** A golden light that runs around the edge of whatever it wraps — the app's mark for "this one is special". The child must draw its own
 * background with the same `borderRadius`. (See GradientBorder for why this is not a Skia border beam.) */
export function BrandBeamFrame({ children, borderRadius = 28 }: { children: ReactNode; borderRadius?: number }) {
  return (
    <GradientBorder mode="beam" colors={BEAM} borderRadius={borderRadius} borderWidth={2} duration={4500}>
      {children}
    </GradientBorder>
  );
}
