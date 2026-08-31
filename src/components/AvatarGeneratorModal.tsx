import { useUser } from "@clerk/expo";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPickerGrid } from "@/components/AvatarPickerGrid";
import { applyProfileImage, dicebearAvatarUrl } from "@/lib/avatar";

type AvatarGeneratorModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Generates ~50 free, keyless DiceBear avatars to pick from — an alternative to "choose from
 * library" for anyone who'd rather not upload a real photo. Applies through the same
 * applyProfileImage path (Clerk hosts it, the backend gets a synced pointer), so a generated avatar
 * shows up everywhere a real uploaded one would, including to crewmates. */
export function AvatarGeneratorModal({ visible, onClose }: AvatarGeneratorModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [applyingSeed, setApplyingSeed] = useState<string | null>(null);

  async function handlePick(seed: string) {
    if (applyingSeed || !user) return;
    setApplyingSeed(seed);
    try {
      const blob = await (await fetch(dicebearAvatarUrl(seed))).blob();
      await applyProfileImage(user, blob);
      onClose();
    } catch (error) {
      Alert.alert("Couldn't set avatar", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setApplyingSeed(null);
    }
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
              <Text className="heading-4 text-text-primary">Generate an Avatar</Text>
              <Text className="body-sm text-text-secondary">Tap one to use it, or shuffle for a new batch.</Text>
            </View>

            <AvatarPickerGrid applyingSeed={applyingSeed} onPick={handlePick} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
