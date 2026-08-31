import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPickerGrid } from "@/components/AvatarPickerGrid";
import { dicebearAvatarUrl } from "@/lib/avatar";

type CrewAvatarGeneratorModalProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
};

/** Same DiceBear generator as the personal AvatarGeneratorModal, but for a crew's icon — no Clerk
 * upload step, the picked image's own URL is handed back and stored directly as the crew's icon
 * (see CrewIconBadge, which renders any http(s) icon value as a real remote image). */
export function CrewAvatarGeneratorModal({ visible, onClose, onPick }: CrewAvatarGeneratorModalProps) {
  const insets = useSafeAreaInsets();

  function handlePick(seed: string) {
    onPick(dicebearAvatarUrl(seed));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} className="justify-end bg-black/50">
        {/* Swallows taps so they don't bubble to the backdrop Pressable and close the sheet. */}
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={FadeInUp.springify().damping(18).mass(0.7)}
            style={{ paddingBottom: insets.bottom + 16, maxHeight: "80%" }}
            className="gap-3 rounded-t-3xl border-t border-divider bg-surface p-4"
          >
            <View>
              <Text className="heading-4 text-text-primary">Generate a Crew Photo</Text>
              <Text className="body-sm text-text-secondary">Tap one to use it, or shuffle for a new batch.</Text>
            </View>

            <AvatarPickerGrid applyingSeed={null} onPick={handlePick} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
