import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Dimensions, Pressable, SafeAreaView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

import { goBack } from "@/lib/navigation";
import { OnboardingFooter } from "@/components/OnboardingFooter";
import { images } from "@/constants/images";
import { colors, typography } from "@/theme";

const MASCOT_ASPECT_RATIO = 520 / 420;
const MASCOT_WIDTH = Dimensions.get("window").width;
const MASCOT_HEIGHT = MASCOT_WIDTH / MASCOT_ASPECT_RATIO;

export default function BuildCrewStartScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral.background }}>
      <View className="flex-1 pb-6 pt-4">
        <Pressable
          onPress={() => goBack()}
          hitSlop={8}
          className="ml-6 mb-2 h-9 w-9 items-center justify-center rounded-full border border-divider"
        >
          <Ionicons name="chevron-back" size={20} color={colors.neutral.textPrimary} />
        </Pressable>

        <View className="items-center gap-2 px-6">
          <Animated.Text
            entering={FadeInDown.springify().damping(14).mass(0.6)}
            className="font-body-semibold text-2xl text-center text-text-primary"
          >
            Build your
          </Animated.Text>
          {/* paddingHorizontal gives the skewed text's box room to actually contain the skew — see
              onboarding/index.tsx's identical wordmark for why this is needed. */}
          <Animated.View entering={FadeInDown.delay(80).springify().damping(14).mass(0.6)} style={{ paddingHorizontal: 20 }}>
            <Text style={typography.heroItalic}>
              <Text style={{ color: colors.neutral.textPrimary }}>GYM</Text>
              <Text style={{ color: colors.brand.yellow }}>CREW</Text>
            </Text>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(180).springify().damping(14).mass(0.6)}
            className="font-body-medium text-xl leading-snug text-center text-text-secondary"
          >
            Stronger together.{"\n"}Unstoppable together.
          </Animated.Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Animated.Image
            entering={ZoomIn.delay(150).springify().damping(11).mass(0.7)}
            source={images.mascotsCrew}
            style={{ width: MASCOT_WIDTH, height: MASCOT_HEIGHT }}
            resizeMode="contain"
          />
        </View>

        <View className="px-6">
          <OnboardingFooter
            label="Let's Build Your Crew"
            activeIndex={0}
            dotCount={5}
            onPress={() => router.push("/build-crew/choose-path")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
