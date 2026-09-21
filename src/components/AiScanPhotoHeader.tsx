import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { AI_SCAN } from "@/constants/ai-scan-theme";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

type AiScanPhotoHeaderProps = {
  photoUri: string;
  calories: number;
  ingredientCount: number;
  /** The meal's amounts per unit, e.g. "420 g · 250 ml". */
  amountSummary: string;
  slotLabel: string;
  onBack: () => void;
  /** Removes the whole meal from the log. */
  onRemoveMeal: () => void;
};

/** The top of the results: your photo full-bleed, fading into the screen's own background, with the
 * meal's calories laid over it as one big rolling number. No card around it — the photo is the header. */
export function AiScanPhotoHeader({ photoUri, calories, ingredientCount, amountSummary, slotLabel, onBack, onRemoveMeal }: AiScanPhotoHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: 340 + insets.top }}>
      <Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(13,17,23,0.6)", "rgba(13,17,23,0)", "rgba(13,17,23,0.7)", colors.neutral.background]}
        locations={[0, 0.3, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{ backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
          className="h-10 w-10 items-center justify-center rounded-full border"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.brand.white} />
        </Pressable>
        <AnimatedText
          text="YOUR MEAL"
          animationConfig={{ characterDelay: 35 }}
          enterFrom={{ translateY: 24, scale: 0.4 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 22, letterSpacing: 1.2, color: colors.brand.white }}
        />
        <Pressable
          onPress={onRemoveMeal}
          hitSlop={8}
          style={{ backgroundColor: AI_SCAN.overlay, borderColor: AI_SCAN.overlayBorder }}
          className="h-10 w-10 items-center justify-center rounded-full border"
          accessibilityLabel="Remove this meal"
        >
          <Ionicons name="trash-outline" size={19} color={colors.brand.white} />
        </Pressable>
      </View>

      <View style={{ position: "absolute", left: 20, right: 20, bottom: 14 }} className="gap-1">
        <Text className="caption font-body-bold" style={{ color: AI_SCAN.textOnMedia, letterSpacing: 1.4 }}>
          AI ESTIMATE
        </Text>
        <View className="flex-row items-baseline gap-2">
          <NumberFlow value={calories} fontSize={56} color={colors.brand.white} fontWeight="800" />
          <Text className="body-md font-body-bold" style={{ color: NUTRITION_COLORS.calories }}>
            kcal
          </Text>
        </View>
        <Text className="caption" style={{ color: AI_SCAN.textOnMedia }}>
          {`${ingredientCount} ${ingredientCount === 1 ? "ingredient" : "ingredients"} · ${amountSummary} · ${slotLabel}`}
        </Text>
      </View>
    </View>
  );
}
