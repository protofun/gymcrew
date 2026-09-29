import type { ReactNode } from "react";

import { GradientBorder } from "@/components/GradientBorder";
import { AI_SCAN } from "@/constants/ai-scan-theme";

const BEAM: [string, string] = [AI_SCAN.glow[0], AI_SCAN.glow[1] ?? AI_SCAN.glow[0]];

/** A light that runs around the edge of the AI flow's cards. The child must draw its own background with the same `borderRadius`. */
export function AiBeamFrame({ children, borderRadius = 24 }: { children: ReactNode; borderRadius?: number }) {
  return (
    <GradientBorder mode="beam" colors={BEAM} borderRadius={borderRadius} borderWidth={1.5} duration={6000}>
      {children}
    </GradientBorder>
  );
}
