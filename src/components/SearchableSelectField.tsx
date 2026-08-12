import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/theme";

type SearchableSelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

export function SearchableSelectField({ label, value, options, onChange }: SearchableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));

  function handleSelect(option: string) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <View className="gap-2">
      <Text className="body-md text-text-primary">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-divider bg-surface px-4 py-4"
      >
        <Text className="body-md text-text-primary">{value}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={colors.neutral.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              maxHeight: "75%",
              backgroundColor: colors.neutral.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
            className="gap-4 p-6"
          >
            <Text className="heading-4 text-text-primary">{label}</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={colors.neutral.textSecondary}
              autoFocus
              className="body-md rounded-xl border border-divider bg-background px-4 py-3 text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.map((option) => (
                <Pressable key={option} onPress={() => handleSelect(option)} className="border-b border-divider py-3">
                  <Text className={`body-md ${option === value ? "text-brand-yellow" : "text-text-primary"}`}>
                    {option}
                  </Text>
                </Pressable>
              ))}
              {filtered.length === 0 && <Text className="body-md py-3 text-text-secondary">No results found.</Text>}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
