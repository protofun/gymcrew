import type { ReactNode } from "react";

import { BorderBeam } from "@/components/ui/base/border-beam";
import { AI_SCAN } from "@/constants/ai-scan-theme";

// Stable, so the beam doesn't rebuild its color palette on every render.
const BEAM_COLORS = [...AI_SCAN.glow];

/** Wraps a card in the Reacticx Border Beam — a glowing light that runs around its edge (a Skia
 * shader, native only; the web build uses AiBeamFrame.web.tsx). The child must draw its own
 * background with the same `borderRadius`. */
export function AiBeamFrame({ children, borderRadius = 24 }: { children: ReactNode; borderRadius?: number }) {
  return (
    <BorderBeam borderRadius={borderRadius} borderWidth={1.5} glow={8} duration={6} beamLength={0.4} colors={BEAM_COLORS} ambient={0.2}>
      {children}
    </BorderBeam>
  );
}
