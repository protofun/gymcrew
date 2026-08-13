import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { images } from "@/constants/images";
import { colors } from "@/theme";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View className="gap-6">
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        className="h-6 w-6 items-center justify-center self-start"
      >
        <Text className="text-2xl text-text-primary">←</Text>
      </Pressable>

      <View className="items-center gap-2">
        <Animated.Text
          entering={FadeInDown.springify().damping(14).mass(0.6)}
          className="font-heading text-5xl leading-none"
          style={{ fontStyle: "italic", transform: [{ skewX: "-10deg" }] }}
        >
          <Text className="text-text-primary">GYM</Text>
          <Text className="text-brand-yellow">CREW</Text>
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(80).springify().damping(14).mass(0.6)}
          className="font-body-bold text-3xl text-text-primary"
        >
          {title}
        </Animated.Text>

        <Animated.View
          entering={FadeInUp.delay(140).springify().damping(14).mass(0.6)}
          className="flex-row items-center gap-1.5"
        >
          <Text className="body-lg text-text-secondary">{subtitle}</Text>
          <Ionicons name="flash" size={16} color={colors.semantic.warning} />
        </Animated.View>

        <Animated.Image
          entering={ZoomIn.delay(200).springify().damping(11).mass(0.7)}
          source={images.mascotAuthScreen}
          style={{ width: 340, height: 340 * (430 / 760) }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
