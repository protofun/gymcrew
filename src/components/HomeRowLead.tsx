import type { ReactNode } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { CircularProgress } from "@/components/ui/organisms/circular-progress";
import { colors } from "@/theme";
import { HOME_ACCENT, HOME_LEAD_SIZE, HOME_LEAD_STROKE } from "@/components/homeStyle";

type HomeRowLeadProps =
  | { kind: "ring"; progress: SharedValue<number>; color?: string; children: ReactNode }
  | { kind: "image"; source: ImageSourcePropType }
  | { kind: "flat"; children: ReactNode };

/** Every row of Home's flowing list opens with exactly the same shape — a 44px circle — so the list reads as one thing.
 * `ring` fills toward a live ratio (Reacticx `circular-progress`) with whatever sits inside it; `image` is a flat picture
 * (a crew mascot); `flat` is a plain circle around any other component (a rank medal) for a row with nothing to measure a
 * ratio of. */
export function HomeRowLead(props: HomeRowLeadProps) {
  if (props.kind === "image") {
    return (
      <View style={{ width: HOME_LEAD_SIZE, height: HOME_LEAD_SIZE, borderRadius: HOME_LEAD_SIZE / 2, backgroundColor: colors.neutral.surface }} className="items-center justify-center overflow-hidden">
        <Image source={props.source} resizeMode="cover" style={{ width: HOME_LEAD_SIZE, height: HOME_LEAD_SIZE }} />
      </View>
    );
  }

  if (props.kind === "flat") {
    return (
      <View style={{ width: HOME_LEAD_SIZE, height: HOME_LEAD_SIZE, borderRadius: HOME_LEAD_SIZE / 2, backgroundColor: colors.neutral.surface }} className="items-center justify-center">
        {props.children}
      </View>
    );
  }

  return (
    <CircularProgress
      progress={props.progress}
      size={HOME_LEAD_SIZE}
      strokeWidth={HOME_LEAD_STROKE}
      gap={0}
      outerCircleColor={colors.neutral.divider}
      progressCircleColor={props.color ?? HOME_ACCENT}
      backgroundColor="transparent"
      renderIcon={() => props.children}
    />
  );
}
