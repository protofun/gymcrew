import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, Share, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { colors } from "@/theme";

type InviteMembersModalProps = {
  visible: boolean;
  onClose: () => void;
  crewName: string;
  inviteCode: string;
};

export function InviteMembersModal({ visible, onClose, crewName, inviteCode }: InviteMembersModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    Share.share({
      message: `Join my crew "${crewName}" on GymCrew! Use invite code ${inviteCode} to join.`,
    }).catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}
      >
        <Animated.View
          entering={FadeInUp.springify().damping(16).mass(0.7)}
          className="w-full gap-4 rounded-3xl border border-divider bg-surface p-5"
        >
          <View className="flex-row items-center justify-between">
            <Text className="heading-4 text-text-primary">Invite Members</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.neutral.textSecondary} />
            </Pressable>
          </View>

          <Text className="body-sm text-text-secondary">
            Share this code with friends so they can join {crewName}.
          </Text>

          <View className="items-center gap-1 rounded-2xl border border-dashed border-brand-yellow bg-background py-5">
            <Text className="heading-3 text-brand-yellow" style={{ letterSpacing: 4 }}>
              {inviteCode}
            </Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleCopy}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-divider py-3.5"
            >
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={colors.neutral.textPrimary} />
              <Text className="body-md font-body-semibold text-text-primary">{copied ? "Copied!" : "Copy Code"}</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-3.5"
            >
              <Ionicons name="share-social-outline" size={18} color={colors.brand.iron} />
              <Text className="body-md font-body-bold text-brand-iron">Share</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
