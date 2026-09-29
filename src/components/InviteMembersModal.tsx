import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { BrandBeamFrame } from "@/components/BrandBeamFrame";
import { crewInviteLink } from "@/lib/crew-invite-link";
import { colors, fontFamily } from "@/theme";

type InviteMembersModalProps = {
  visible: boolean;
  onClose: () => void;
  crewName: string;
  inviteCode: string;
};

/** Same Reacticx `BottomSheet` shell every other Crew sheet uses now — the invite code itself gets a
 * `BrandBeamFrame` (the app's one mark for "this is special"), not a dashed border, since it's the one
 * thing on this sheet worth drawing the eye to. */
export function InviteMembersModal({ visible, onClose, crewName, inviteCode }: InviteMembersModalProps) {
  const posthog = usePostHog();
  const [copied, setCopied] = useState(false);
  const inviteLink = crewInviteLink(inviteCode);

  async function handleCopy() {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    posthog.capture("crew_invite_copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    // `message` carries the link too, not just `url` — Android's share sheet ignores `url`
    // entirely and only ever sends `message`, so a link that only lived in `url` would silently
    // never reach the friend being invited there. Tapping the link opens straight to
    // app/invite/[code].tsx, no manual code entry — the whole point of this being a link at all.
    Share.share({
      message: `Join my crew "${crewName}" on GymCrew! ${inviteLink}`,
      url: inviteLink,
    })
      .then(() => posthog.capture("crew_invite_shared"))
      .catch((error) => console.warn("Sharing is unavailable on this platform", error));
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="gap-4 px-4 pb-4 pt-2">
        <Text className="heading-4 text-text-primary">Invite Members</Text>
        <Text className="body-sm text-text-secondary">Share this code with friends so they can join {crewName}.</Text>

        <BrandBeamFrame borderRadius={20}>
          <View className="items-center py-5" style={{ backgroundColor: colors.neutral.background, borderRadius: 20 }}>
            <Text style={{ fontFamily: fontFamily.heading, fontSize: 26, letterSpacing: 4, color: colors.brand.yellow }}>{inviteCode}</Text>
          </View>
        </BrandBeamFrame>

        <View className="flex-row gap-3">
          <Pressable onPress={handleCopy} className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-divider py-3.5">
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={colors.neutral.textPrimary} />
            <Text className="body-md font-body-semibold text-text-primary">{copied ? "Copied!" : "Copy Link"}</Text>
          </Pressable>

          <Pressable onPress={handleShare} className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-brand-yellow py-3.5">
            <Ionicons name="share-social-outline" size={18} color={colors.brand.iron} />
            <Text className="body-md font-body-bold text-brand-iron">Share</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
