import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { EditableAnimatedText } from "@/components/EditableAnimated";
import { EditableText } from "@/components/EditableText";
import { colors, fontFamily } from "@/theme";

type SectionHeadingProps = {
  /** Dev Mode override id of the title, e.g. "home.goals.headline". */
  id: string;
  title: string;
  /** A small line above the title. */
  eyebrow?: string;
  /** Dev Mode override id of the eyebrow, when it has one. */
  eyebrowId?: string;
  /** Round buttons or a link on the right. */
  right?: ReactNode;
  /** Font size of the title — smaller when something wide shares its row. */
  size?: number;
};

/** The heading of a Home section — a small line above, the title as big animated letters, an action on the right.
 * Every section on Home starts the same way, so the page reads as one column instead of a stack of boxes. */
export function SectionHeading({ id, title, eyebrow, eyebrowId, right, size = 34 }: SectionHeadingProps) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1 gap-0.5">
        {eyebrow ? (
          eyebrowId ? (
            <EditableText id={eyebrowId} style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, color: colors.neutral.textSecondary }}>
              {eyebrow.toUpperCase()}
            </EditableText>
          ) : (
            <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, color: colors.neutral.textSecondary }}>{eyebrow.toUpperCase()}</Text>
          )
        ) : null}
        <EditableAnimatedText id={id} style={{ fontFamily: fontFamily.heading, fontSize: size, lineHeight: size + 4, letterSpacing: 1, color: colors.brand.white }}>
          {title.toUpperCase()}
        </EditableAnimatedText>
      </View>
      {right}
    </View>
  );
}
