import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { BANNER_KIND_STYLES, BannerContent } from "@/components/PromoBanners";
import { useAdminMessageStore } from "@/store/admin-message-store";
import { trackBannerViewOnce, useBannerStore } from "@/store/banner-store";
import { useUserSocialsStore } from "@/store/user-socials-store";

/** An admin-managed popup (see backend/routes/banners.php), shown once over the app and never again
 * once closed. Only the first unseen popup shows at a time, and never on top of another blocking
 * overlay: the socials prompt (up while its status is confirmed `null`) or a message from the admin. */
export function PromoPopup() {
  const banners = useBannerStore((state) => state.banners);
  const dismissedIds = useBannerStore((state) => state.dismissedIds);
  const dismiss = useBannerStore((state) => state.dismiss);
  const socialsPromptShowing = useUserSocialsStore((state) => state.status === null);
  const adminMessagePending = useAdminMessageStore((state) => state.pending.length > 0);
  const blocked = socialsPromptShowing || adminMessagePending;

  const popup = banners.find((b) => b.display === "popup" && !dismissedIds.includes(b.id)) ?? null;
  const visible = popup !== null && !blocked;
  const popupId = popup?.id ?? null;

  useEffect(() => {
    if (visible && popupId !== null) trackBannerViewOnce(popupId);
  }, [visible, popupId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => popup && dismiss(popup.id)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }} className="items-center justify-center p-6">
        {popup && (
          <View
            className="w-full max-w-[400px] gap-5 rounded-3xl border bg-surface p-6"
            style={{ borderColor: `${BANNER_KIND_STYLES[popup.kind].color}66` }}
          >
            <BannerContent banner={popup} onCtaPress={() => dismiss(popup.id)} />
            <Pressable onPress={() => dismiss(popup.id)} className="items-center rounded-full border border-divider py-3">
              <Text className="body-md font-body-semibold text-text-primary">Got it</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}
