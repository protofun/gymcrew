import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ALL_TEMPLATES } from "@/data/workout-templates";
import { colors } from "@/theme";

type TodayWorkoutModalProps = {
  visible: boolean;
  onClose: () => void;
  isOverridden: boolean;
  onSave: (workoutName: string) => void;
  onClearOverride: () => void;
  /** Defaults to "Today's Training" — overridden (e.g. to a weekday name) when this same picker is
   * reused to assign a day in the recurring weekly schedule rather than a one-off override. */
  title?: string;
};

export function TodayWorkoutModal({ visible, onClose, isOverridden, onSave, onClearOverride, title = "Today's Training" }: TodayWorkoutModalProps) {
  const [query, setQuery] = useState("");

  const filtered = ALL_TEMPLATES.filter((template) => template.name.toLowerCase().includes(query.trim().toLowerCase()));
  const trimmedQuery = query.trim();
  const isCustomEntry = trimmedQuery.length > 0 && !ALL_TEMPLATES.some((template) => template.name.toLowerCase() === trimmedQuery.toLowerCase());

  function handleClose() {
    setQuery("");
    onClose();
  }

  function select(workoutName: string) {
    onSave(workoutName);
    handleClose();
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} snapPoints={["75%"]} keyboardAware>
      <View className="gap-4 px-5 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="heading-4 text-text-primary">{title}</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search or type your own..."
          placeholderTextColor={colors.neutral.textSecondary}
          autoFocus
          className="body-md rounded-xl border border-divider bg-background px-4 py-3 text-text-primary"
          style={{ outlineWidth: 0, outlineColor: "transparent" }}
        />

        <BottomSheetScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {isCustomEntry && (
            <Pressable
              onPress={() => select(trimmedQuery)}
              className="flex-row items-center gap-3 border-b border-divider py-3.5"
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.brand.yellow} />
              <Text className="body-md font-body-semibold text-brand-yellow" numberOfLines={1}>
                Use &quot;{trimmedQuery}&quot;
              </Text>
            </Pressable>
          )}

          {!query && (
            <Pressable onPress={() => select("")} className="flex-row items-center gap-3 border-b border-divider py-3.5">
              <Ionicons name="moon-outline" size={20} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-primary">Rest Day</Text>
            </Pressable>
          )}

          {filtered.map((template) => (
            <Pressable
              key={template.key}
              onPress={() => select(template.name)}
              className="flex-row items-center gap-3 border-b border-divider py-3.5"
            >
              <Ionicons name={template.icon} size={20} color={colors.neutral.textSecondary} />
              <Text className="body-md text-text-primary">{template.name}</Text>
            </Pressable>
          ))}

          {filtered.length === 0 && !isCustomEntry && (
            <Text className="body-md py-3 text-text-secondary">No results found.</Text>
          )}
        </BottomSheetScrollView>

        {isOverridden && (
          <Pressable
            onPress={() => {
              onClearOverride();
              handleClose();
            }}
            className="items-center py-1"
          >
            <Text className="body-sm font-body-semibold text-text-secondary">Use my schedule instead</Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}
