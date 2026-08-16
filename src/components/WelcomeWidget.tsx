import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { images } from "@/constants/images";
import { colors } from "@/theme";

type WelcomeWidgetProps = {
  name: string;
  onPressStartWorkout?: () => void;
};

export function WelcomeWidget({ name, onPressStartWorkout }: WelcomeWidgetProps) {
  return (
    <View className="px-4 pt-[31px]">
      <View className="relative">
        <Image
          source={images.mascotSplash}
          resizeMode="contain"
          style={{ position: "absolute", top: -22, right: -18, width: 224, height: 224 }}
        />

        <View className="pr-2">
          <Text className="body-lg text-text-secondary">Welcome back, {name}! 👋</Text>
          <Text className="heading-2 mt-1 text-brand-white" style={{ fontStyle: "italic" }}>
            READY TO{"\n"}BE UNSTOPPABLE?
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-3">
        <Pressable
          onPress={onPressStartWorkout}
          className="flex-1 flex-row items-center justify-between rounded-full bg-brand-yellow px-5 py-4"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="flash" size={18} color={colors.brand.iron} />
            <Text className="body-lg text-brand-iron" style={{ fontFamily: "Poppins-Bold" }}>
              START WORKOUT
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.brand.iron} />
        </Pressable>

        <Ionicons name="chevron-forward" size={20} color={colors.neutral.textSecondary} />
      </View>
    </View>
  );
}
