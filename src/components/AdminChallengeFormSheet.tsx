import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ToggleRow } from "@/components/ToggleRow";
import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from "@/data/challenges";
import type { AdminChallengeInput, ApiAdminChallenge } from "@/lib/api";
import { colors } from "@/theme";

type AdminChallengeFormSheetProps = {
  visible: boolean;
  /** null = create a new challenge; otherwise edit this one. Editing locks the underlying metric —
   * changing what a challenge even measures after people have already made progress on it would
   * make its stored progress numbers meaningless, so only name/description/target/active are editable. */
  existing: ApiAdminChallenge | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: AdminChallengeInput) => void;
};

/** Create/edit form for an app-wide admin challenge (see admin-challenge-store.ts). Create mode picks
 * a base metric from the same ~100-template pool crew Battles already draw from (see
 * CreateChallengeModal, the closest existing precedent for "pick a challenge type from a list") —
 * reusing those metric definitions instead of building a free-form metric constructor from scratch. */
export function AdminChallengeFormSheet({ visible, existing, saving, onClose, onSubmit }: AdminChallengeFormSheetProps) {
  const [template, setTemplate] = useState<ChallengeTemplate>(CHALLENGE_TEMPLATES[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perMemberTarget, setPerMemberTarget] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSummerChallenge, setIsSummerChallenge] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setPerMemberTarget(String(existing.perMemberTarget));
      setIsActive(existing.isActive);
      setIsSummerChallenge(existing.isSummerChallenge);
    } else {
      setTemplate(CHALLENGE_TEMPLATES[0]);
      setName(CHALLENGE_TEMPLATES[0].name);
      setDescription(CHALLENGE_TEMPLATES[0].description);
      setPerMemberTarget(String(CHALLENGE_TEMPLATES[0].perMemberTarget));
      setIsActive(true);
      setIsSummerChallenge(false);
    }
  }, [visible, existing]);

  function handlePickTemplate(picked: ChallengeTemplate) {
    setTemplate(picked);
    setName(picked.name);
    setDescription(picked.description);
    setPerMemberTarget(String(picked.perMemberTarget));
  }

  function handleSubmit() {
    const target = parseInt(perMemberTarget, 10);
    if (!name.trim() || !Number.isFinite(target) || target <= 0) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      metric: existing ? existing.metric : template.metric,
      unit: existing ? existing.unit : template.unit,
      perMemberTarget: target,
      icon: existing ? existing.icon : template.icon,
      isActive,
      isSummerChallenge,
    });
  }

  const targetNumber = parseInt(perMemberTarget, 10);
  const canSubmit = name.trim().length > 0 && Number.isFinite(targetNumber) && targetNumber > 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={["70%", "94%"]} keyboardAware>
      <View className="flex-row items-center justify-between px-5 pb-2">
        <Text className="heading-4 text-text-primary">{existing ? "Edit Challenge" : "Create Challenge"}</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
        </Pressable>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View className="gap-4">
          {!existing && (
            <View className="gap-2">
              <Text className="body-sm text-text-secondary">Challenge Type</Text>
              <View className="gap-2">
                {CHALLENGE_TEMPLATES.map((option) => {
                  const selected = option.id === template.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => handlePickTemplate(option)}
                      className={`flex-row items-center gap-3 rounded-xl p-3 ${selected ? "bg-brand-yellow/10" : "bg-background"}`}
                    >
                      <Ionicons name={option.icon} size={18} color={selected ? colors.brand.yellow : colors.neutral.textSecondary} />
                      <View className="flex-1 gap-0.5">
                        <Text className={`body-sm font-body-semibold ${selected ? "text-brand-yellow" : "text-text-primary"}`}>
                          {option.name}
                        </Text>
                        <Text className="caption text-text-secondary" numberOfLines={1}>
                          {option.description}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Challenge name"
              placeholderTextColor={colors.neutral.textSecondary}
              className="rounded-xl bg-background px-4 py-3 body-md text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
          </View>

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Short description"
              placeholderTextColor={colors.neutral.textSecondary}
              multiline
              className="rounded-xl bg-background px-4 py-3 body-md text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent", minHeight: 60 }}
            />
          </View>

          <View className="gap-1.5">
            <Text className="body-sm text-text-secondary">Per-Member Target ({existing ? existing.unit : template.unit})</Text>
            <TextInput
              value={perMemberTarget}
              onChangeText={(text) => setPerMemberTarget(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="e.g. 2000"
              placeholderTextColor={colors.neutral.textSecondary}
              className="rounded-xl bg-background px-4 py-3 body-md text-text-primary"
              style={{ outlineWidth: 0, outlineColor: "transparent" }}
            />
            <Text className="caption text-text-secondary">The crew&apos;s real target scales with member count — this is per person.</Text>
          </View>

          <View className="rounded-xl bg-background px-4">
            <ToggleRow title="Active" subtitle="Off = hidden from every crew's Challenges tab." value={isActive} onValueChange={setIsActive} />
          </View>

          <View className="rounded-xl bg-background px-4">
            <ToggleRow
              title="Summer Challenge"
              subtitle="Shown in its own locked section until the app's release."
              value={isSummerChallenge}
              onValueChange={setIsSummerChallenge}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
            className={`items-center rounded-full py-3.5 ${canSubmit ? "bg-brand-yellow" : "bg-background"}`}
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            <Text className={`body-md font-body-bold ${canSubmit ? "text-brand-iron" : "text-text-secondary"}`}>
              {saving ? "Saving…" : existing ? "Save Changes" : "Create Challenge"}
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
