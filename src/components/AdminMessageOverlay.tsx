import { Modal, Pressable, Text, View } from "react-native";

import { useAdminMessageStore } from "@/store/admin-message-store";
import { useUserSocialsStore } from "@/store/user-socials-store";

/**
 * Blocking-until-dismissed overlay for an admin-composed message targeted at this account (see
 * admin-message-store.ts) — e.g. a warning that free access depends on actually promoting GymCrew.
 * Unlike SocialsPromptOverlay, this one has a real dismiss button: it's informational, not
 * collecting anything. Deliberately hidden while SocialsPromptOverlay is still showing (checked via
 * `status`, not `pending` directly, so the two overlays never stack) — that one takes priority since
 * it can't be dismissed at all, whereas this one will simply show right after.
 */
export function AdminMessageOverlay() {
  const socialsStatus = useUserSocialsStore((state) => state.status);
  const pending = useAdminMessageStore((state) => state.pending);
  const dismiss = useAdminMessageStore((state) => state.dismiss);

  const current = pending[0] ?? null;
  const visible = current !== null && socialsStatus !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => current && dismiss(current.id)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }} className="items-center justify-center p-6">
        <View className="w-full max-w-[400px] gap-5 rounded-3xl border border-divider bg-surface p-6">
          <Text className="heading-4 text-text-primary">Message from GymCrew</Text>
          {current && <Text className="body-md text-text-secondary">{current.message}</Text>}
          <Pressable
            onPress={() => current && dismiss(current.id)}
            className="items-center rounded-full bg-brand-yellow py-3.5"
          >
            <Text className="body-md font-body-semibold text-brand-iron">Got It</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
