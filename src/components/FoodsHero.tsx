import type { ImageSourcePropType } from "react-native";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

import { NumberFlow } from "@/components/ui/molecules/number-flow";
import { colors, fontFamily } from "@/theme";

type FoodsHeroProps = {
  /** The app's illustration for this tab. */
  image: ImageSourcePropType;
  count: number;
  /** e.g. "SHAKES SAVED". */
  label: string;
  stats: { label: string; value: number; unit: string }[];
  /** The "build one" button — omit for tabs that create elsewhere. */
  createLabel?: string;
  onCreate?: () => void;
};

/** The overview at the top of a Foods tab: the tab's own illustration (gently bobbing), how many there are as a
 * big rolling number, a couple of averages, and the button that builds a new one. */
export function FoodsHero({ image, count, label, stats, createLabel, onCreate }: FoodsHeroProps) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [bob]);

  const imageStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + bob.value * 8 }, { rotate: `${-3 + bob.value * 6}deg` }] }));

  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} className="gap-4">
      <View className="flex-row items-center gap-5">
        <Animated.View style={imageStyle}>
          <Image source={image} resizeMode="contain" style={{ width: 96, height: 96 }} />
        </Animated.View>
        <View className="flex-1 gap-2">
          <View className="flex-row items-baseline gap-2">
            <NumberFlow value={count} fontSize={46} color={colors.brand.white} fontWeight="800" style={{ transform: [{ skewX: "-8deg" }] }} />
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: 1, color: colors.neutral.textSecondary }}>{label}</Text>
          </View>
          <View className="flex-row gap-5">
            {stats.map((stat) => (
              <View key={stat.label} className="gap-0.5">
                <View className="flex-row items-baseline gap-1">
                  <NumberFlow value={stat.value} fontSize={17} color={colors.brand.white} fontWeight="700" />
                  <Text className="caption text-text-secondary">{stat.unit}</Text>
                </View>
                <Text className="caption text-text-secondary">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {createLabel && onCreate && (
        <Pressable onPress={onCreate} className="flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-3.5" accessibilityLabel={createLabel}>
          <Ionicons name="add" size={18} color={colors.brand.iron} />
          <Text className="body-md font-body-semibold text-brand-iron">{createLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
