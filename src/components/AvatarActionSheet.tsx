import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

type AvatarActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onGenerateAvatar: () => void;
};

function ActionRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={20} color={colors.neutral.textPrimary} />
      <Text className="body-lg text-text-primary">{label}</Text>
    </Pressable>
  );
}

/**
 * `Alert.alert` with custom buttons never renders on React Native Web (same issue as
 * ConfirmModal's — see its doc comment), which made "tap the avatar to change your photo" a
 * dead tap on the PWA. This is the cross-platform replacement.
 */
export function AvatarActionSheet({ visible, onClose, onChoosePhoto, onGenerateAvatar }: AvatarActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18).mass(0.7)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}
        >
          <Pressable onPress={() => {}} className="gap-1 rounded-t-3xl border border-divider bg-surface px-5 pb-2 pt-4">
            <Text className="body-sm mb-2 text-text-secondary">Change Photo</Text>
            <ActionRow icon="image-outline" label="Choose from Library" onPress={onChoosePhoto} />
            <View className="h-px bg-divider" />
            <ActionRow icon="sparkles-outline" label="Generate an Avatar" onPress={onGenerateAvatar} />
            <View className="h-px bg-divider" />
            <ActionRow icon="close-outline" label="Cancel" onPress={onClose} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
