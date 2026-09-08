import { Text } from "react-native";

import { EditableText } from "@/components/EditableText";
import { fontFamily } from "@/theme";

type SkewedStatProps = {
  children: string;
  size?: number;
  color?: string;
  className?: string;
  /** Dev Mode override id (see EditableText) — omit to render plain, non-editable text. Threading
   * this through here (rather than hardcoding Text) cascades Dev Mode coverage across every screen
   * that uses SkewedStat in one place, same trick StatTile/StatRow/ChallengeCard already use. */
  id?: string;
};

/** GymCrew's signature bold skewed-italic stat number — same look as body-log.tsx's weight
 * readout, ChallengeCard/NewPrsBanner's titles, and TopBar's wordmark. Centralized here since
 * Nutrition uses it in far more places (calories, macros, weight, meal totals) than any single
 * screen used it before. Always inline style, never className, for the transform/font-style
 * NativeWind-on-native reason typography.ts documents. */
export function SkewedStat({ children, size = 28, color, className, id }: SkewedStatProps) {
  const style = {
    fontFamily: fontFamily.heading,
    fontSize: size,
    lineHeight: size * 1.05,
    fontStyle: "italic" as const,
    transform: [{ skewX: "-8deg" as const }],
    color,
  };

  if (id) {
    return (
      <EditableText id={id} className={className} style={style}>
        {children}
      </EditableText>
    );
  }

  return (
    <Text className={className} style={style}>
      {children}
    </Text>
  );
}
