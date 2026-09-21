import { Pressable, Text } from "react-native";

import { ChromaRing } from "@/components/ui/organisms/chroma-ring";
import { colors, fontFamily } from "@/theme";

type AiChromaButtonProps = {
  onPress: () => void;
  size?: number;
};

/** The "there's AI here" button: a round button labelled AI, circled by a slowly shifting chrome ring (Reacticx
 * `chroma-ring`, a Skia shader — native only; the web build uses AiChromaButton.web.tsx). Opens the meal scan. */
export function AiChromaButton({ onPress, size = 46 }: AiChromaButtonProps) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel="Scan a meal with AI">
      <ChromaRing width={size} height={size} borderRadius={size / 2} borderWidth={2.5} speed={1.2} base={colors.brand.yellow} glow="#00E5FF" background={colors.neutral.surface}>
        <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 0.5, color: colors.brand.white }}>AI</Text>
      </ChromaRing>
    </Pressable>
  );
}
