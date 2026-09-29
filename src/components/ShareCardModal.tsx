import { useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { PrimaryButton } from "@/components/PrimaryButton";
import { shareViewAsImage } from "@/lib/share-image";

type ShareCardModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Plain-text fallback for web (react-native-view-shot has no web implementation) or if the
   * capture/share step fails on-device — same fallback contract as pr-celebration.tsx/ranks.tsx. */
  fallbackMessage: string;
  /** What is shown, and shared — a `ShareFrame` with the card in it. */
  children: ReactNode;
};

/** Tap-to-preview-then-share, shared by the workout results screen and each individual PR row. What you see in the preview is exactly
 * the picture that gets shared: the whole frame is captured (at the device's full resolution) and handed to the share sheet as an image;
 * only if that can't be done does it fall back to plain text. */
export function ShareCardModal({ visible, onClose, fallbackMessage, children }: ShareCardModalProps) {
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      await shareViewAsImage({ ref: cardRef, fileName: "gymcrew-workout.png", fallbackMessage, dialogTitle: "Share your workout" });
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }} className="justify-center">
        <Pressable onPress={() => {}} style={{ maxHeight: "94%" }}>
          <ScrollView contentContainerClassName="items-center gap-5 px-5 py-6" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp.springify().damping(16).mass(0.7)} style={{ width: "100%", maxWidth: 400 }}>
              {/* Only this is captured — the frame itself, not the buttons under it. */}
              <View ref={cardRef} collapsable={false} style={{ borderRadius: 4, overflow: "hidden" }}>
                {children}
              </View>
            </Animated.View>

            <View className="w-full gap-3" style={{ maxWidth: 400 }}>
              <PrimaryButton label="Share picture" loading={sharing} onPress={handleShare} />
              <PrimaryButton label="Close" variant="ghost" hideArrow onPress={onClose} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
