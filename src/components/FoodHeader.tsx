import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { NUTRITION_COLORS } from "@/lib/nutrition-colors";
import { colors, fontFamily } from "@/theme";

type FoodHeaderProps = {
  photoUrl?: string;
  title: string;
  /** Brand and serving, one muted line under the name. */
  subtitle?: string;
  /** Calories for the amount currently picked — rolls when the amount changes. */
  calories: number;
  /** Small animated label at the top, e.g. "FOOD" or "EDIT ENTRY". */
  label: string;
  onBack: () => void;
  /** Round buttons on the right (favorite, remove, ...). */
  actions?: ReactNode;
};

/** The top of a food page: its photo full-bleed, fading into the screen's background, with the name and
 * the calories of the picked amount laid over it. Foods without a photo get a soft yellow wash and a big
 * icon instead. */
export function FoodHeader({ photoUrl, title, subtitle, calories, label, onBack, actions }: FoodHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: 300 + insets.top }}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.neutral.surface }]} className="items-center justify-center">
          <Ionicons name="fast-food-outline" size={110} color="rgba(227,255,0,0.14)" />
        </View>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={photoUrl ? ["rgba(13,17,23,0.6)", "rgba(13,17,23,0)", "rgba(13,17,23,0.7)", colors.neutral.background] : ["rgba(227,255,0,0.10)", "rgba(13,17,23,0)", colors.neutral.background]}
        locations={photoUrl ? [0, 0.3, 0.78, 1] : [0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16 }} className="flex-row items-center justify-between">
        <Pressable onPress={onBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-divider bg-background/60" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.brand.white} />
        </Pressable>
        <AnimatedText
          text={label}
          animationConfig={{ characterDelay: 35 }}
          enterFrom={{ translateY: 24, scale: 0.4 }}
          style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 1.2, color: colors.brand.white }}
        />
        <View className="min-w-10 flex-row items-center justify-end gap-2">{actions}</View>
      </View>

      <View style={{ position: "absolute", left: 20, right: 20, bottom: 12 }} className="gap-1">
        <Text numberOfLines={2} style={{ fontFamily: fontFamily.heading, fontSize: 34, lineHeight: 36, letterSpacing: 0.8, color: colors.brand.white }}>
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text className="caption text-text-secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View className="flex-row items-baseline gap-2 pt-1">
          <NumberFlow value={calories} fontSize={44} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
          <Text className="body-md font-body-bold" style={{ color: NUTRITION_COLORS.calories }}>
            kcal
          </Text>
        </View>
      </View>
    </View>
  );
}
