import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
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
  if (!member) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-1 px-5 pb-2 pt-4">
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
      </View>
    </BottomSheet>
  );
}
