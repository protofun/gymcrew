import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useRef, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, Share, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { colors } from "@/theme";

type ShareCardModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Plain-text fallback for web (react-native-view-shot has no web implementation) or if the
   * capture/share step fails on-device — same fallback contract as pr-celebration.tsx/ranks.tsx. */
  fallbackMessage: string;
  children: ReactNode;
};

/** Tap-to-preview-then-share, shared by the workout results screen and each individual PR row —
 * shows the card itself (not just a bare share sheet) so sharing feels like a deliberate "post
 * this" moment, and centralizes the capture+share mechanics so neither call site duplicates it. */
export function ShareCardModal({ visible, onClose, fallbackMessage, children }: ShareCardModalProps) {
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  function shareAsText() {
    Share.share({ message: fallbackMessage }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  async function handleShare() {
    if (sharing) return;
    if (Platform.OS === "web" || !cardRef.current) {
      shareAsText();
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        shareAsText();
      }
    } catch (error) {
      console.warn("Failed to capture share card, falling back to text share", error);
      shareAsText();
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)" }} className="items-center justify-center p-6">
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 400 }} className="gap-4">
          <View ref={cardRef} collapsable={false}>
            {children}
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 items-center rounded-full border border-divider py-4">
              <Text className="body-md font-body-semibold text-text-primary">Close</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              disabled={sharing}
              style={({ pressed }) => ({ opacity: pressed || sharing ? 0.85 : 1 })}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-4"
            >
              <Ionicons name={sharing ? "hourglass-outline" : "share-outline"} size={18} color={colors.brand.iron} />
              <Text className="body-md font-body-semibold text-brand-iron">{sharing ? "Sharing..." : "Share"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
