import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { images } from "@/constants/images";
import { colors } from "@/theme";

const PRESSED_STYLE = ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.85 : 1 });

export default function WorkoutSplitIntroScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-background">
      <View className="relative flex-row items-center justify-center px-4 pb-3">
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ position: "absolute", left: 16 }}>
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </Pressable>
      </View>

      <View className="flex-1 justify-between px-6 pb-6">
        <View className="items-center gap-5 pt-4">
          <Animated.Image
            entering={ZoomIn.springify().damping(11).mass(0.7)}
            source={images.mascotFlexing}
            style={{ width: 220, height: 220 * (205 / 250) }}
            resizeMode="contain"
          />

          <Animated.View entering={FadeInUp.delay(100).springify().damping(14).mass(0.6)} className="items-center gap-2">
            <Text className="heading-2 text-center text-text-primary">Build your perfect split</Text>
            <Text className="body-md text-center text-text-secondary">Train smarter based on your GymCrew ranks.</Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(180).springify().damping(14).mass(0.6)}
            className="body-md text-center text-text-secondary"
          >
            We&apos;ll analyze your body graph and build a weekly plan that focuses on the muscle
            groups that need you most — not just harder training, the right training.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInUp.delay(240).springify().damping(14).mass(0.6)} className="gap-3">
          <Pressable
            onPress={() => router.push("/workout-split/analyze")}
            style={PRESSED_STYLE}
            className="items-center rounded-full bg-brand-yellow py-4"
          >
            <Text className="body-md font-body-semibold text-brand-iron">Build My Split</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/profile/workout-split")}
            style={PRESSED_STYLE}
            className="items-center rounded-full border border-divider py-4"
          >
            <Text className="body-md font-body-semibold text-text-primary">Create Manually</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
