import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { StaggeredText } from "@/components/ui/organisms/animated-text";
import { goBack } from "@/lib/navigation";
import { images } from "@/constants/images";
import { colors, fontFamily, spring } from "@/theme";

// StaggeredText's blur-reveal (its default look) doesn't render correctly on web (expo-blur's
// animated intensity misbehaves there) — disabled everywhere it's used, keeping only the
// fade/slide/scale per-character reveal, which is confirmed working on web.
const NO_BLUR = { maxBlurIntensity: 0 };
const WORDMARK_STYLE = { fontFamily: fontFamily.heading, fontSize: 48, fontStyle: "italic" as const, transform: [{ skewX: "-10deg" as const }] };

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View className="gap-6">
      <Pressable
        onPress={() => goBack()}
        hitSlop={12}
        className="h-6 w-6 items-center justify-center self-start"
      >
        <Text className="text-2xl text-text-primary">←</Text>
      </Pressable>

      <View className="items-center gap-2">
        <View className="flex-row">
          <StaggeredText text="GYM" style={[WORDMARK_STYLE, { color: colors.neutral.textPrimary }]} animationConfig={NO_BLUR} />
          <StaggeredText text="CREW" style={[WORDMARK_STYLE, { color: colors.brand.yellow }]} animationConfig={{ ...NO_BLUR, characterDelay: 40 }} />
        </View>

        <StaggeredText
          text={title}
          style={{ fontFamily: fontFamily.bodyBold, fontSize: 30, color: colors.neutral.textPrimary }}
          animationConfig={NO_BLUR}
        />

        <Animated.View
          entering={FadeInUp.delay(140).springify().damping(spring.entranceBouncy.damping).mass(spring.entranceBouncy.mass)}
          className="flex-row items-center gap-1.5"
        >
          <Text className="body-lg text-text-secondary">{subtitle}</Text>
          <Ionicons name="flash" size={16} color={colors.semantic.warning} />
        </Animated.View>

        <Animated.Image
          entering={ZoomIn.delay(200).springify().damping(spring.press.damping).mass(spring.press.mass)}
          source={images.mascotAuthScreen}
          style={{ width: 340, height: 340 * (430 / 760) }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
