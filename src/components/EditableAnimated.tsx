import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { EditableText } from "@/components/EditableText";
import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { useDeveloperModeStore } from "@/store/developer-mode-store";
import { colors, fontFamily } from "@/theme";

/** True while Developer Mode is on, or a text override is saved for `id` — then the plain, tap-to-edit `EditableText`
 * takes over from the animated version (see EditableText). Otherwise the animation plays. */
function useShowsPlainText(id: string): { plain: boolean; override: string | undefined } {
  const enabled = useDeveloperModeStore((state) => state.enabled);
  const override = useDeveloperModeStore((state) => state.overrides[id]);
  return { plain: enabled || override !== undefined, override };
}

type EditableAnimatedTextProps = {
  id: string;
  /** Use "\n" to break lines — each line animates on its own, so a word is never split across two. */
  children: string;
  style: TextStyle;
  characterDelay?: number;
};

/** A heading whose letters fly in one by one (Reacticx `animated-text`) — and that Developer Mode can still override, like `EditableText`. */
export function EditableAnimatedText({ id, children, style, characterDelay = 28 }: EditableAnimatedTextProps) {
  const { plain, override } = useShowsPlainText(id);

  if (plain) {
    return (
      <EditableText id={id} style={style}>
        {children}
      </EditableText>
    );
  }

  return (
    <View>
      {(override ?? children).split("\n").map((line) => (
        <AnimatedText key={line} text={line} animationConfig={{ characterDelay }} enterFrom={{ translateY: 32, scale: 0.4 }} style={style} />
      ))}
    </View>
  );
}

type EditableNumberFlowProps = {
  id: string;
  value: number;
  decimals?: number;
  fontSize: number;
  color?: string;
  fontWeight?: TextStyle["fontWeight"];
  /** Small text after the number ("kcal", "%") — with the plain fallback it is written straight after it. */
  suffix?: string;
  suffixColor?: string;
  style?: StyleProp<TextStyle>;
};

/** A number that rolls to its value like an odometer (Reacticx `number-flow`) — with the same Developer Mode override as `EditableText`. */
export function EditableNumberFlow({ id, value, decimals = 0, fontSize, color = colors.brand.white, fontWeight = "800", suffix, suffixColor = colors.neutral.textSecondary, style }: EditableNumberFlowProps) {
  const { plain } = useShowsPlainText(id);

  if (plain) {
    return (
      <EditableText id={id} style={[{ fontFamily: fontFamily.bodyBold, fontSize, color }, style]}>
        {`${value.toFixed(decimals)}${suffix ?? ""}`}
      </EditableText>
    );
  }

  return (
    <View className="flex-row items-baseline gap-1">
      <NumberFlow value={value} decimals={decimals} fontSize={fontSize} color={color} fontWeight={fontWeight} style={style as StyleProp<ViewStyle>} />
      {suffix ? <Text style={{ fontFamily: fontFamily.bodySemiBold, fontSize: Math.max(11, Math.round(fontSize * 0.42)), color: suffixColor }}>{suffix}</Text> : null}
    </View>
  );
}
