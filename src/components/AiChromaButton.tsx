import { Pressable, Text, View } from "react-native";

import { GradientBorder } from "@/components/GradientBorder";
import { colors, fontFamily } from "@/theme";

type AiChromaButtonProps = {
  onPress: () => void;
  size?: number;
};

const RING: [string, string, string, string] = [colors.brand.yellow, "#00E5FF", "#FFFFFF", "#FF5FA2"];

/** The "there's AI here" button: a round button labelled AI, circled by a ring of shifting color. Opens the meal scan. */
export function AiChromaButton({ onPress, size = 46 }: AiChromaButtonProps) {
  const inner = size - 5;

  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel="Scan a meal with AI">
      <GradientBorder mode="ring" colors={RING} borderRadius={size / 2} borderWidth={2.5} duration={3500}>
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.neutral.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fontFamily.heading, fontSize: 17, letterSpacing: 0.5, color: colors.brand.white }}>AI</Text>
        </View>
      </GradientBorder>
    </Pressable>
  );
}
