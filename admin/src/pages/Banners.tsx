import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { BannerEditor } from "../components/admin/BannerEditor";
import { BannerPreview } from "../components/admin/BannerPreview";
import { EMPTY_BANNER } from "../lib/banners";
import { api, ApiError, type AdminBanner, type BannerInput, type BannerStatus } from "../lib/api";

const STATUS_BADGES: Record<BannerStatus, { label: string; color: "success" | "warning" | "light" | "error" }> = {
  live: { label: "Live", color: "success" },
  scheduled: { label: "Scheduled", color: "warning" },
  expired: { label: "Ended", color: "light" },
  off: { label: "Switched off", color: "light" },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  new: "New users",
  no_workout: "No workout yet",
  no_crew: "No crew",
  in_crew: "In a crew",
  founding: "Founding athletes",
};

/** The editable part of a banner — drops the server-computed fields (status, views, …). */
function toInput(banner: AdminBanner): BannerInput {
  return {
    kind: banner.kind,
    display: banner.display,
    placement: banner.placement,
    title: banner.title,
    message: banner.message,
    ctaLabel: banner.ctaLabel,
    ctaUrl: banner.ctaUrl,
    promoCode: banner.promoCode,
    audience: banner.audience,
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    dismissible: banner.dismissible,
    priority: banner.priority,
    active: banner.active,
  };
}

function formatWindow(banner: AdminBanner): string {
  const fmt = (ms: number) => new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  if (banner.startsAt && banner.endsAt) return `${fmt(banner.startsAt)} → ${fmt(banner.endsAt)}`;
  if (banner.startsAt) return `From ${fmt(banner.startsAt)}`;
  if (banner.endsAt) return `Until ${fmt(banner.endsAt)}`;
  return "No time limit";
}

type Editing = { id: number | null; initial: BannerInput } | null;

export default function Banners() {
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  function load() {
    api
      .getBanners()
      .then(setBanners)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load banners"));
  }
  useEffect(load, []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  function handleDelete(banner: AdminBanner) {
    if (!window.confirm("Delete this banner? Its view and click counts are lost too.")) return;
    run(() => api.deleteBanner(banner.id), "Banner deleted");
  }

  if (editing) {
    return (
      <>
        <PageMeta title="Banners & Promos | GymCrew Admin" description="Create a banner or popup for the app" />
        <PageBreadcrumb pageTitle={editing.id === null ? "New Banner" : "Edit Banner"} />
        <BannerEditor
          bannerId={editing.id}
          initial={editing.initial}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageMeta title="Banners & Promos | GymCrew Admin" description="Banners and popups shown in the app" />
      <PageBreadcrumb pageTitle="Banners & Promos" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          Put a deal, an important notice or some news in front of your users. Banners sit at the top of a screen; popups appear once,
          over the app. Target everyone or a group, and schedule them ahead of time.
        </p>
        <Button size="sm" onClick={() => setEditing({ id: null, initial: EMPTY_BANNER })}>
          New banner
        </Button>
      </div>

      {error && <p className="text-sm text-error-500">{error}</p>}
      {!banners && !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {banners && banners.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No banners yet. Create one to show a message or a deal in the app.
        </div>
      )}

      <div className="space-y-4">
        {banners?.map((banner) => {
          const badge = STATUS_BADGES[banner.status];
          const ctr = banner.views > 0 ? `${((banner.clicks / banner.views) * 100).toFixed(1)}%` : "—";
          return (
            <div key={banner.id} className="grid grid-cols-1 gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:grid-cols-2">
              <BannerPreview banner={banner} />

              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" color={badge.color}>{badge.label}</Badge>
                    <Badge size="sm" color="light">{banner.display === "popup" ? "Popup" : `Banner · ${banner.placement}`}</Badge>
                    <Badge size="sm" color="light">{AUDIENCE_LABELS[banner.audience] ?? banner.audience}</Badge>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">{formatWindow(banner)}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {banner.views.toLocaleString()} views · {banner.clicks.toLocaleString()} taps · {ctr} tap rate
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => run(() => api.updateBanner(banner.id, { active: !banner.active }), banner.active ? "Switched off" : "Switched on")}>
                    {banner.active ? "Switch off" : "Switch on"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: banner.id, initial: toInput(banner) })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: null, initial: { ...toInput(banner), active: false } })}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="outline" className="!text-error-500" onClick={() => handleDelete(banner)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
