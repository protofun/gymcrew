import type { ReactNode } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

import { spring, staggerDelay } from "@/theme";

/** Brings a Home section in — sliding up and settling with a spring — a beat after the one above it. `bleed` lets it run edge to edge.
 * `tight` drops the top margin to nothing, for consecutive rows of the same flowing list (each row already carries its own divider
 * and padding — a big gap between them would break the "one list" look). */
export function HomeReveal({ index, bleed = false, tight = false, children }: { index: number; bleed?: boolean; tight?: boolean; children: ReactNode }) {
  const spacing = tight ? "mt-0" : "mt-9";
  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index, { base: 60, step: 90, max: 520 })).springify().damping(spring.entrance.damping).mass(spring.entrance.mass)} className={bleed ? `${spacing} overflow-hidden` : `mx-4 ${spacing}`}>
      {children}
    </Animated.View>
  );
}
