import type { BannerInput, BannerKind } from "./api";

/** Per-kind look in the preview, mirrored from the app's PromoBanners.tsx — keep the two in sync. */
export const BANNER_KIND_STYLES: Record<BannerKind, { label: string; color: string; icon: string }> = {
  info: { label: "Info", color: "#E3FF00", icon: "📣" },
  deal: { label: "Deal", color: "#FF6D00", icon: "🏷️" },
  important: { label: "Important", color: "#FF3B30", icon: "⚠️" },
  success: { label: "Good news", color: "#00C853", icon: "✅" },
};

export const EMPTY_BANNER: BannerInput = {
  kind: "info",
  display: "banner",
  placement: "home",
  title: null,
  message: "",
  ctaLabel: null,
  ctaUrl: null,
  promoCode: null,
  audience: "all",
  startsAt: null,
  endsAt: null,
  dismissible: true,
  priority: 0,
  active: true,
};

/** "Ends in 2d 4h" / "Ends in 5h" / "Ends in 40m" for a deal's countdown line, or null once over. */
export function formatTimeLeft(endsAt: number, now = Date.now()): string | null {
  const minutes = Math.floor((endsAt - now) / 60000);
  if (minutes <= 0) return null;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h`;
  return `Ends in ${minutes}m`;
}
