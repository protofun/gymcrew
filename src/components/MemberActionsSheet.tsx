import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CrewMember } from "@/store/crew-store";
import { colors } from "@/theme";

type MemberActionsSheetProps = {
  visible: boolean;
  member: CrewMember | null;
  onClose: () => void;
  onPromote: () => void;
  onDemote: () => void;
  onToggleAdmin: () => void;
  onRemove: () => void;
};

function ActionRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name={icon} size={20} color={destructive ? colors.semantic.error : colors.neutral.textPrimary} />
      <Text className={`body-lg ${destructive ? "text-error" : "text-text-primary"}`}>{label}</Text>
    </Pressable>
  );
}

export function MemberActionsSheet({
  visible,
  member,
  onClose,
  onPromote,
  onDemote,
  onToggleAdmin,
  onRemove,
}: MemberActionsSheetProps) {
  const insets = useSafeAreaInsets();
  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18).mass(0.7)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}
        >
          <Pressable onPress={() => {}} className="gap-1 rounded-t-3xl border border-divider bg-surface px-5 pb-2 pt-4">
            <Text className="body-sm mb-2 text-text-secondary" numberOfLines={1}>
              {member.name} · @{member.username}
            </Text>

            {member.role === "member" && (
              <>
                <ActionRow icon="arrow-up-circle-outline" label="Promote to Co-Leader" onPress={onPromote} />
                <View className="h-px bg-divider" />
              </>
            )}
            {member.role === "co-leader" && (
              <>
                <ActionRow icon="arrow-down-circle-outline" label="Demote to Member" onPress={onDemote} />
                <View className="h-px bg-divider" />
              </>
            )}
            <ActionRow
              icon={member.isAdmin ? "shield-outline" : "shield-checkmark-outline"}
              label={member.isAdmin ? "Remove Admin" : "Make Admin"}
              onPress={onToggleAdmin}
            />
            <View className="h-px bg-divider" />
            <ActionRow icon="exit-outline" label="Remove from Crew" destructive onPress={onRemove} />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
