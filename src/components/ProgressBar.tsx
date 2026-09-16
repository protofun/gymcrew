import { AnimatedProgressBar } from "@/components/ui/organisms/progress";
import { colors, duration, radius } from "@/theme";

const DEFAULT_HEIGHT = 7;

type ProgressBarProps = {
  ratio: number;
  color: string;
  height?: number;
};

/**
 * Thin GymCrew-shaped wrapper around Reacticx's `AnimatedProgressBar` — kept as its own component
 * (rather than inlining the primitive at all 14 call sites) so every existing screen's
 * `<ProgressBar ratio={...} color={...} />` call keeps working unchanged. The primitive's own
 * `progress`/`animationDuration`/`borderRadius`/`trackColor` props map directly onto values GymCrew
 * already used (700ms duration, full pill radius, the app's divider color for the track) — nothing
 * about the visual result changes from the previous hand-rolled implementation.
 */
export function ProgressBar({ ratio, color, height = DEFAULT_HEIGHT }: ProgressBarProps) {
  return (
    <AnimatedProgressBar
      progress={Math.min(1, Math.max(0, ratio))}
      progressColor={color}
      trackColor={colors.neutral.divider}
      height={height}
      borderRadius={radius.pill}
      animationDuration={duration.standard}
    />
  );
}
