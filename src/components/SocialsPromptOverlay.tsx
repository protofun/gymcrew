import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { FormField } from "@/components/FormField";
import { useUserSocialsStore } from "@/store/user-socials-store";
import { colors } from "@/theme";

/**
 * Blocking "Connect Your Socials" prompt — shown whenever the signed-in shell mounts and the
 * caller's own `user_socials` row doesn't exist yet (see user-socials-store.ts's `status`). No
 * close/skip affordance and `onRequestClose` is a no-op: both Instagram and TikTok are required
 * before this stops appearing. Once submitted, `status` flips to non-null and this renders nothing
 * on every later mount, including future app opens.
 */
export function SocialsPromptOverlay() {
  const status = useUserSocialsStore((state) => state.status);
  const submitting = useUserSocialsStore((state) => state.submitting);
  const submit = useUserSocialsStore((state) => state.submit);

  const [instagramHandle, setInstagramHandle] = useState("");
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visible = status === null;
  const canSubmit = instagramHandle.trim().length > 0 && tiktokHandle.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    const result = await submit(instagramHandle.trim(), tiktokHandle.trim());
    if (!result.ok) setError(result.error);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }} className="items-center justify-center p-6">
        <View className="w-full max-w-[400px] gap-5 rounded-3xl border border-divider bg-surface p-6">
          <View className="gap-2">
            <Text className="heading-4 text-text-primary">Connect Your Socials</Text>
            <Text className="body-sm text-text-secondary">
              Add your Instagram and TikTok — we check who&apos;s actually promoting GymCrew.
            </Text>
          </View>

          <View className="gap-3">
            <FormField
              label="Instagram handle"
              placeholder="@yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
              value={instagramHandle}
              onChangeText={setInstagramHandle}
            />
            <FormField
              label="TikTok handle"
              placeholder="@yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
              value={tiktokHandle}
              onChangeText={setTiktokHandle}
            />
          </View>

          {error && <Text className="body-sm text-error">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
            className="items-center rounded-full bg-brand-yellow py-3.5"
          >
            {submitting ? <ActivityIndicator color={colors.brand.iron} /> : <Text className="body-md font-body-semibold text-brand-iron">Submit</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
