import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { colors } from "@/theme";

type ExerciseActionsSheetProps = {
  visible: boolean;
  exerciseName: string;
  hasNote: boolean;
  hasInstructions: boolean;
  onClose: () => void;
  onReplace: () => void;
  onEditNote: () => void;
  onViewInstructions: () => void;
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

export function ExerciseActionsSheet({
  visible,
  exerciseName,
  hasNote,
  hasInstructions,
  onClose,
  onReplace,
  onEditNote,
  onViewInstructions,
  onRemove,
}: ExerciseActionsSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-1 px-5 pb-2 pt-4">
        <Text className="body-sm mb-2 text-text-secondary" numberOfLines={1}>
          {exerciseName}
        </Text>

        <ActionRow icon="swap-horizontal-outline" label="Replace Exercise" onPress={onReplace} />
        <View className="h-px bg-divider" />
        <ActionRow icon="create-outline" label={hasNote ? "Edit Note" : "Add Note"} onPress={onEditNote} />
        {hasInstructions && (
          <>
            <View className="h-px bg-divider" />
            <ActionRow icon="book-outline" label="View Instructions" onPress={onViewInstructions} />
          </>
        )}
        <View className="h-px bg-divider" />
        <ActionRow icon="trash-outline" label="Remove Exercise" destructive onPress={onRemove} />
      </View>
    </BottomSheet>
  );
}
