import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { colors } from "@/theme";

type ExerciseInstructionsModalProps = {
  visible: boolean;
  exerciseName: string;
  imageUrl: string;
  instructions: string[];
  onClose: () => void;
};

export function ExerciseInstructionsModal({
  visible,
  exerciseName,
  imageUrl,
  instructions,
  onClose,
}: ExerciseInstructionsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
          style={{ maxHeight: "80%" }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <Text className="heading-4 flex-1 text-text-primary" numberOfLines={2}>
              {exerciseName}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            {!!imageUrl && <Image source={{ uri: imageUrl }} className="h-48 w-full rounded-2xl bg-background" resizeMode="cover" />}

            <View className="gap-3">
              {instructions.map((step, index) => (
                <View key={index} className="flex-row gap-3">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-yellow/15">
                    <Text className="caption font-body-semibold text-brand-yellow">{index + 1}</Text>
                  </View>
                  <Text className="body-sm flex-1 text-text-secondary">{step}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
