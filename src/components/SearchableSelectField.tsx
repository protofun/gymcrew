import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { FieldLabel } from "@/components/OnboardingScreen";
import { Tray } from "@/components/ui/organisms/tray";
import { colors, fontFamily } from "@/theme";

const TRAY_PALETTE = {
  surface: colors.neutral.surface,
  border: colors.neutral.divider,
  handle: colors.neutral.divider,
  text: colors.brand.white,
  mutedText: colors.neutral.textSecondary,
  backdrop: "rgba(0,0,0,0.6)",
};

type SearchableSelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** "wizard" is the look of the sign-up steps and crew setup: small caps label, rounder field, yellow chevron. */
  variant?: "default" | "wizard";
};

/** A single-choice field opening a searchable sheet — the real Reacticx `organisms/tray` now,
 * not a hand-rolled `Modal`. Used well beyond Profile (the onboarding wizard, Crew's Training Focus
 * picker), so its own flat-surface pass applies everywhere it's used, not just the one screen that
 * prompted it. */
export function SearchableSelectField({ label, value, options, onChange, variant = "default" }: SearchableSelectFieldProps) {
  const wizard = variant === "wizard";
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
      {wizard ? <FieldLabel>{label}</FieldLabel> : <Text className="body-md text-text-primary">{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        className={wizard ? "flex-row items-center justify-between rounded-2xl bg-surface px-4 py-4" : "flex-row items-center justify-between rounded-xl bg-surface px-4 py-4"}
      >
        <Text className={wizard ? "body-md flex-1 pr-2 font-body-semibold text-text-primary" : "body-md text-text-primary"} numberOfLines={1}>
          {value}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={wizard ? colors.brand.yellow : colors.neutral.textSecondary} />
      </Pressable>

      <Tray
        theme="dark"
        palette={TRAY_PALETTE}
        defaultView="options"
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        detents={["55%", "88%"]}
        radius={24}
      >
        <Tray.Content>
          <Tray.View id="options">
            <Tray.Header>
              <Tray.Title style={{ fontFamily: fontFamily.bodySemiBold, fontSize: 20, fontWeight: undefined }}>{label}</Tray.Title>
              <Tray.Close>{({ color, size }) => <Ionicons name="close" size={size} color={color} />}</Tray.Close>
            </Tray.Header>

            <View className="px-5 pb-3">
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={colors.neutral.textSecondary}
                className="body-md rounded-xl bg-background px-4 py-3 text-text-primary"
                style={{ outlineWidth: 0, outlineColor: "transparent" }}
              />
            </View>

            <Tray.ScrollView maxHeight={640} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              {filtered.map((option) => (
                <Pressable key={option} onPress={() => handleSelect(option)} className="border-b border-divider py-3">
                  <Text className={`body-md ${option === value ? "text-brand-yellow" : "text-text-primary"}`}>{option}</Text>
                </Pressable>
              ))}
              {filtered.length === 0 && <Text className="body-md py-3 text-text-secondary">No results found.</Text>}
            </Tray.ScrollView>
          </Tray.View>
        </Tray.Content>
      </Tray>
    </View>
  );
}
