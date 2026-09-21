import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import SpinButton from "@/components/ui/micro-interactions/spin-button";
import AnimatedText from "@/components/ui/organisms/animated-text";
import { images } from "@/constants/images";
import { colors, fontFamily } from "@/theme";

type DiaryEmptyProps = {
  dateKey: string;
  isToday: boolean;
  /** Something was logged the day before — offers to copy it over. */
  canCopyPrevious: boolean;
  onCopyPrevious: () => void;
};

/** Nothing logged for the viewed day: the mascot, a line that animates in, and the three quickest ways to start. */
export function DiaryEmpty({ dateKey, isToday, canCopyPrevious, onCopyPrevious }: DiaryEmptyProps) {
  return (
    <View className="items-center gap-4 py-8">
      <Image source={images.mascotFlexing} resizeMode="contain" style={{ width: 120, height: 120 * (205 / 250) }} />
      <AnimatedText
        text="NOTHING LOGGED YET"
        animationConfig={{ characterDelay: 28 }}
        enterFrom={{ translateY: 26, scale: 0.4 }}
        style={{ fontFamily: fontFamily.heading, fontSize: 28, letterSpacing: 1, color: colors.brand.white }}
      />
      <Text className="body-sm text-center text-text-secondary">{isToday ? "Log your first meal of the day." : "Add what you ate this day."}</Text>

      <Animated.View entering={FadeInDown.delay(400).springify()} className="w-full gap-3 pt-2">
        <Pressable onPress={() => router.push({ pathname: "/nutrition/scan-meal", params: { date: dateKey } })} className="items-center rounded-full bg-brand-yellow py-3.5">
          <Text className="body-md font-body-semibold text-brand-iron">Scan a meal</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/nutrition/add", params: { date: dateKey } })} className="items-center rounded-full border border-divider py-3.5">
          <Text className="body-md font-body-semibold text-text-primary">Search food</Text>
        </Pressable>
        {canCopyPrevious && (
          <View className="items-center pt-1">
            <SpinButton
              idleText="Copy the day before"
              activeText="Copying…"
              onPress={() => onCopyPrevious()}
              colors={{
                idle: { background: colors.neutral.surface, text: colors.brand.white },
                active: { background: colors.brand.yellow, text: colors.brand.iron },
              }}
              buttonStyle={{ paddingHorizontal: 22, paddingVertical: 11, borderRadius: 999, fontSize: 14, fontWeight: "600" }}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
}
