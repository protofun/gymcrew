import { Pagination } from "@/components/ui/molecules/Pagination/Pagination";
import { colors } from "@/theme";

type OnboardingDotsProps = {
  count: number;
  activeIndex: number;
};

/**
 * Built on Reacticx's `Pagination` — a real upgrade in polish (an animated pill-shaped indicator
 * slides between dots, versus the old grow-and-recolor-in-place dot). One accepted trade-off: the
 * primitive is designed for a swipeable carousel and ships its own drag-to-jump pan gesture across
 * the full screen width; this usage doesn't wire that back into real navigation (there's nothing to
 * jump to outside the step the "Continue" button already advances), so a deliberate drag here can
 * visually nudge the indicator without moving the wizard forward. Judged an acceptable, unlikely-to-
 * matter trade-off for adopting the primitive as-is rather than forking it to strip the gesture.
 * `activeColor`/`inactiveColor` both map to divider so — matching the original — only the current
 * step stands out, with no separate "already passed" treatment.
 */
export function OnboardingDots({ count, activeIndex }: OnboardingDotsProps) {
  return (
    <Pagination
      activeIndex={activeIndex}
      totalItems={count}
      dotSize={8}
      borderRadius={999}
      inactiveColor={colors.neutral.divider}
      activeColor={colors.neutral.divider}
      currentColor={colors.brand.yellow}
      containerStyle={{ backgroundColor: colors.neutral.divider }}
      style={{ alignSelf: "center" }}
    />
  );
}
