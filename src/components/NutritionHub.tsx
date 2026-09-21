import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NutritionNavBar } from "@/components/NutritionNavBar";
import type { NutritionSection } from "@/lib/nutrition-nav";

/** The frame of the four Nutrition hub pages: the safe area on top, the page, and Nutrition's own bottom bar.
 * `overlay` floats over the page (not over the bar) — the diary puts its add and AI buttons there. */
export function NutritionHub({ active, overlay, children }: { active: NutritionSection; overlay?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-background">
      <Animated.View entering={FadeIn.duration(220)} className="flex-1">
        {children}
        {overlay}
      </Animated.View>
      <NutritionNavBar active={active} />
    </View>
  );
}
