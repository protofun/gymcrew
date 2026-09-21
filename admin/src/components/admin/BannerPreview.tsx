import type { BannerDisplay, BannerKind } from "../../lib/api";
import { BANNER_KIND_STYLES, formatTimeLeft } from "../../lib/banners";

type PreviewBanner = {
  kind: BannerKind;
  display: BannerDisplay;
  title: string | null;
  message: string;
  ctaLabel: string | null;
  promoCode: string | null;
  endsAt: number | null;
  dismissible: boolean;
};

/** What a banner or popup will look like in the app — dark card on the app's own background, so the
 * admin sees the real thing while typing. */
export function BannerPreview({ banner }: { banner: PreviewBanner }) {
  const style = BANNER_KIND_STYLES[banner.kind];
  const timeLeft = banner.kind === "deal" && banner.endsAt ? formatTimeLeft(banner.endsAt) : null;
  const isPopup = banner.display === "popup";

  return (
    <div className={`rounded-2xl bg-[#0D1117] ${isPopup ? "p-6" : "p-3"}`}>
      <div
        className={`flex flex-col gap-3 rounded-2xl border bg-[#161A20] p-4 ${isPopup ? "mx-auto max-w-[320px] rounded-3xl p-6" : ""}`}
        style={{ borderColor: `${style.color}66` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-base leading-5">{style.icon}</span>
          <div className="flex-1">
            {banner.title && <p className="text-sm font-semibold text-[#EDEFF2]">{banner.title}</p>}
            <p className={`text-sm text-[#EDEFF2] ${banner.title ? "mt-0.5 text-[#8B929E]" : ""}`}>{banner.message || "Your message shows up here…"}</p>
          </div>
          {!isPopup && banner.dismissible && <span className="text-[#8B929E]">✕</span>}
        </div>

        {(banner.promoCode || timeLeft) && (
          <div className="flex items-center justify-between gap-3">
            {banner.promoCode && (
              <span className="rounded-lg border border-dashed px-3 py-1.5 text-xs font-semibold tracking-widest text-[#EDEFF2]" style={{ borderColor: style.color }}>
                {banner.promoCode}
              </span>
            )}
            {timeLeft && <span className="text-xs font-medium" style={{ color: style.color }}>{timeLeft}</span>}
          </div>
        )}

        {banner.ctaLabel && (
          <span className="rounded-full py-2.5 text-center text-sm font-semibold text-[#1F2328]" style={{ backgroundColor: style.color }}>
            {banner.ctaLabel}
          </span>
        )}
        {isPopup && <span className="rounded-full border border-[#2C3138] py-2.5 text-center text-sm font-semibold text-[#EDEFF2]">Got it</span>}
      </div>
    </div>
  );
}
