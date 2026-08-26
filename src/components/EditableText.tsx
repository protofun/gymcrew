import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View, type StyleProp, type TextStyle } from "react-native";

import { useDeveloperModeStore } from "@/store/developer-mode-store";
import { colors } from "@/theme";

type EditableTextProps = {
  /** Stable, unique key for this spot's override — e.g. "home.welcome.headline". */
  id: string;
  children: string;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/**
 * Drop-in replacement for <Text> that becomes tap-to-edit when Developer Mode is on (see
 * profile/account.tsx, gated to DEVELOPER_MODE_USER_ID) — for temporarily overriding copy/numbers
 * shown on screen when recording demo content. Overrides are local-only (AsyncStorage), never sent
 * to the backend, and never affect real app data. Outside Developer Mode this renders exactly like
 * a plain <Text>.
 */
export function EditableText({ id, children, className, style, numberOfLines }: EditableTextProps) {
  const enabled = useDeveloperModeStore((state) => state.enabled);
  const override = useDeveloperModeStore((state) => state.overrides[id]);
  const setOverride = useDeveloperModeStore((state) => state.setOverride);
  const clearOverride = useDeveloperModeStore((state) => state.clearOverride);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const displayText = override ?? children;

  if (!enabled) {
    return (
      <Text className={className} style={style} numberOfLines={numberOfLines}>
        {displayText}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(displayText);
          setEditing(true);
        }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.brand.yellow, borderStyle: "dashed" }}
      >
        <Text className={className} style={style} numberOfLines={numberOfLines}>
          {displayText}
        </Text>
      </Pressable>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}>
          <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
            <Text className="body-sm text-text-secondary">Dev Mode override — local only, never saved to the server</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus
              className="body-md rounded-xl border border-divider bg-background p-3 text-text-primary"
              style={{ minHeight: 60, outlineWidth: 0, outlineColor: "transparent" }}
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  clearOverride(id);
                  setEditing(false);
                }}
                className="flex-1 items-center rounded-full border border-divider py-3"
              >
                <Text className="body-sm text-text-secondary">Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setOverride(id, draft);
                  setEditing(false);
                }}
                className="flex-1 items-center rounded-full bg-brand-yellow py-3"
              >
                <Text className="body-sm font-body-semibold text-brand-iron">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
