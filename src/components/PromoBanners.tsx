import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { api, isApiConfigured, type ApiBanner, type BannerKind } from "@/lib/api";
import { copyPromoCode, formatTimeLeft, openBannerLink } from "@/lib/banner-actions";
import { trackBannerViewOnce, useBannerStore } from "@/store/banner-store";
import { colors } from "@/theme";

/** Per-kind look — mirrored in the admin panel's BannerPreview.tsx, keep the two in sync. */
export const BANNER_KIND_STYLES: Record<BannerKind, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: { color: colors.brand.yellow, icon: "megaphone" },
  deal: { color: colors.semantic.streak, icon: "pricetag" },
  important: { color: colors.semantic.error, icon: "alert-circle" },
  success: { color: colors.semantic.success, icon: "checkmark-circle" },
};

/** The message, promo code and button of one banner or popup — shared by both so they can't drift. */
export function BannerContent({ banner, onCtaPress }: { banner: ApiBanner; onCtaPress?: () => void }) {
  const style = BANNER_KIND_STYLES[banner.kind];
  const timeLeft = banner.kind === "deal" && banner.endsAt ? formatTimeLeft(banner.endsAt) : null;

  function handleCta() {
    if (!banner.ctaUrl) return;
    if (isApiConfigured) api.trackBannerClick(banner.id).catch(() => {});
    onCtaPress?.();
    openBannerLink(banner.ctaUrl);
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-start gap-3">
        <Ionicons name={style.icon} size={18} color={style.color} style={{ marginTop: 1 }} />
        <View className="flex-1 gap-0.5">
          {banner.title && <Text className="body-md font-body-semibold text-text-primary">{banner.title}</Text>}
          <Text className={banner.title ? "body-sm text-text-secondary" : "body-sm text-text-primary"}>{banner.message}</Text>
        </View>
      </View>

      {(banner.promoCode || timeLeft) && (
        <View className="flex-row items-center justify-between gap-3">
          {banner.promoCode ? (
            <Pressable
              onPress={() => copyPromoCode(banner.promoCode!)}
              className="flex-row items-center gap-2 rounded-lg border border-dashed px-3 py-1.5"
              style={{ borderColor: style.color }}
            >
              <Text className="body-sm font-body-semibold text-text-primary">{banner.promoCode}</Text>
              <Ionicons name="copy-outline" size={14} color={colors.neutral.textSecondary} />
            </Pressable>
          ) : (
            <View />
          )}
          {timeLeft && (
            <Text className="body-sm font-body-semibold" style={{ color: style.color }}>
              {timeLeft}
            </Text>
          )}
        </View>
      )}

      {banner.ctaLabel && banner.ctaUrl && (
        <Pressable onPress={handleCta} className="items-center rounded-full py-3" style={{ backgroundColor: style.color }}>
          <Text className="body-md font-body-semibold text-brand-iron">{banner.ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Banner({ banner }: { banner: ApiBanner }) {
  const dismiss = useBannerStore((state) => state.dismiss);
  const style = BANNER_KIND_STYLES[banner.kind];

  useEffect(() => {
    trackBannerViewOnce(banner.id);
  }, [banner.id]);

  return (
    <View className="rounded-2xl border bg-surface p-4" style={{ borderColor: `${style.color}66` }}>
      <View className={banner.dismissible ? "pr-6" : ""}>
        <BannerContent banner={banner} />
      </View>
      {banner.dismissible && (
        <Pressable onPress={() => dismiss(banner.id)} hitSlop={8} style={{ position: "absolute", top: 12, right: 12 }}>
          <Ionicons name="close" size={18} color={colors.neutral.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

/** The admin-managed banners for one tab (see backend/routes/banners.php) — renders nothing when
 * there are none, so it's safe to drop at the top of any tab's scroll content. A banner stays until
 * the person closes it (if the admin allowed that), the admin switches it off, or its end time passes. */
export function PromoBanners({ placement }: { placement: ApiBanner["placement"] }) {
  const banners = useBannerStore((state) => state.banners);
  const dismissedIds = useBannerStore((state) => state.dismissedIds);

  const visible = banners.filter((b) => b.display === "banner" && b.placement === placement && !dismissedIds.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <View className="mx-4 mt-4 gap-3">
      {visible.map((banner) => (
        <Banner key={banner.id} banner={banner} />
      ))}
    </View>
  );
}
