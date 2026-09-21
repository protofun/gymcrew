import { useState } from "react";
import { toast } from "sonner";

import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { BannerPreview } from "./BannerPreview";
import { BANNER_KIND_STYLES, EMPTY_BANNER } from "../../lib/banners";
import {
  api,
  ApiError,
  type BannerAudience,
  type BannerDisplay,
  type BannerInput,
  type BannerKind,
  type BannerPlacement,
} from "../../lib/api";

const AUDIENCES: { value: BannerAudience; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "new", label: "New users (joined in the last 14 days)" },
  { value: "no_workout", label: "Users who haven't logged a workout yet" },
  { value: "no_crew", label: "Users without a crew" },
  { value: "in_crew", label: "Users in a crew" },
  { value: "founding", label: "Founding athletes" },
];

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: "home", label: "Home tab" },
  { value: "log", label: "Log tab" },
  { value: "crew", label: "Crew tab" },
  { value: "ranks", label: "Ranks tab" },
  { value: "profile", label: "Profile tab" },
];

/** Screens a button can open — the server only accepts "/…" (a screen in the app) or "https://…". */
const LINK_PRESETS: { value: string; label: string }[] = [
  { value: "/profile/subscription", label: "Subscription page" },
  { value: "/(tabs)/crew", label: "Crew tab" },
  { value: "/(tabs)/ranks", label: "Ranks tab" },
  { value: "/(tabs)/log", label: "Log tab" },
  { value: "/nutrition", label: "Nutrition diary" },
  { value: "/progress-photos/compare", label: "Progress photo comparison" },
];

/** Starting points for the common cases — everything stays editable afterwards. */
const TEMPLATES: { label: string; banner: Partial<BannerInput> }[] = [
  {
    label: "Discount deal",
    banner: {
      kind: "deal",
      title: "20% off GymCrew Pro",
      message: "Unlock ranks, your gym's leaderboard and crews. Use the code at checkout.",
      promoCode: "GYM20",
      ctaLabel: "Get the deal",
      ctaUrl: "/profile/subscription",
    },
  },
  {
    label: "Maintenance notice",
    banner: {
      kind: "important",
      title: "Scheduled maintenance",
      message: "GymCrew will be unavailable tonight from 22:00 to 23:00.",
      dismissible: true,
    },
  },
  {
    label: "New feature",
    banner: {
      kind: "success",
      title: "New: AI meal scan",
      message: "Snap a photo of your plate and GymCrew logs it for you.",
      ctaLabel: "Try it",
      ctaUrl: "/nutrition",
    },
  },
  {
    label: "Join a crew (no crew yet)",
    banner: {
      kind: "info",
      title: "Train better together",
      message: "Crews compete, share their plans and celebrate every PR. Start or join one today.",
      audience: "no_crew",
      ctaLabel: "Open Crew",
      ctaUrl: "/(tabs)/crew",
    },
  },
];

const SELECT_CLASSES =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function Select<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <select className={SELECT_CLASSES} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A `datetime-local` input's value ("2026-09-21T18:30", in the browser's own timezone) <-> epoch ms. */
function toLocalInput(ms: number | null): string {
  if (ms === null) return "";
  const date = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}
function fromLocalInput(value: string): number | null {
  return value ? new Date(value).getTime() : null;
}

type BannerEditorProps = {
  /** null = creating a new banner. */
  bannerId: number | null;
  initial: BannerInput;
  onCancel: () => void;
  onSaved: () => void;
};

/** The create/edit form for one banner or popup, with a live preview of how it looks in the app. */
export function BannerEditor({ bannerId, initial, onCancel, onSaved }: BannerEditorProps) {
  const [banner, setBanner] = useState<BannerInput>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BannerInput>(key: K, value: BannerInput[K]) => setBanner((prev) => ({ ...prev, [key]: value }));
  const setText = (key: "title" | "ctaLabel" | "ctaUrl" | "promoCode") => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, e.target.value === "" ? null : e.target.value);

  const isPopup = banner.display === "popup";
  const linkPreset = LINK_PRESETS.some((p) => p.value === banner.ctaUrl) ? banner.ctaUrl ?? "" : banner.ctaUrl ? "custom" : "";

  async function handleSave() {
    setSaving(true);
    try {
      if (bannerId === null) await api.createBanner(banner);
      else await api.updateBanner(bannerId, banner);
      toast.success(bannerId === null ? "Banner created" : "Banner saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save the banner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{bannerId === null ? "New banner" : "Edit banner"}</h3>
          {bannerId === null && (
            <div className="flex flex-wrap justify-end gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  onClick={() => setBanner({ ...EMPTY_BANNER, ...t.banner })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Style</Label>
            <Select<BannerKind>
              value={banner.kind}
              options={(Object.keys(BANNER_KIND_STYLES) as BannerKind[]).map((k) => ({ value: k, label: BANNER_KIND_STYLES[k].label }))}
              onChange={(v) => set("kind", v)}
            />
          </div>
          <div>
            <Label>Shown as</Label>
            <Select<BannerDisplay>
              value={banner.display}
              options={[
                { value: "banner", label: "Banner on a screen" },
                { value: "popup", label: "Popup (shown once)" },
              ]}
              onChange={(v) => set("display", v)}
            />
          </div>
          <div>
            <Label>Screen</Label>
            {isPopup ? (
              <p className="flex h-11 items-center text-sm text-gray-500 dark:text-gray-400">Any screen</p>
            ) : (
              <Select<BannerPlacement> value={banner.placement} options={PLACEMENTS} onChange={(v) => set("placement", v)} />
            )}
          </div>
        </div>

        <div>
          <Label>Title (optional)</Label>
          <Input value={banner.title ?? ""} onChange={setText("title")} placeholder="e.g. 20% off GymCrew Pro" />
        </div>
        <div>
          <Label>Message</Label>
          <TextArea rows={3} value={banner.message} onChange={(v) => set("message", v)} placeholder="What do you want people to know?" />
          <p className="mt-1 text-right text-xs text-gray-400">{banner.message.length}/500</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Button label (optional)</Label>
            <Input value={banner.ctaLabel ?? ""} onChange={setText("ctaLabel")} placeholder="e.g. Get the deal" />
          </div>
          <div>
            <Label>Button opens</Label>
            <Select<string>
              value={linkPreset}
              options={[{ value: "", label: "Nothing" }, ...LINK_PRESETS, { value: "custom", label: "Other link…" }]}
              onChange={(v) => set("ctaUrl", v === "" ? null : v === "custom" ? "https://" : v)}
            />
          </div>
          {linkPreset === "custom" && (
            <div className="sm:col-span-2">
              <Label>Link</Label>
              <Input value={banner.ctaUrl ?? ""} onChange={setText("ctaUrl")} placeholder="https://… or /screen-in-the-app" />
            </div>
          )}
        </div>

        <div>
          <Label>Promo code (optional)</Label>
          <Input value={banner.promoCode ?? ""} onChange={setText("promoCode")} placeholder="e.g. GYM20 — shown with a copy button" />
        </div>

        <div>
          <Label>Who sees it</Label>
          <Select<BannerAudience> value={banner.audience} options={AUDIENCES} onChange={(v) => set("audience", v)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Starts (optional)</Label>
            <Input type="datetime-local" value={toLocalInput(banner.startsAt)} onChange={(e) => set("startsAt", fromLocalInput(e.target.value))} />
          </div>
          <div>
            <Label>Ends (optional)</Label>
            <Input type="datetime-local" value={toLocalInput(banner.endsAt)} onChange={(e) => set("endsAt", fromLocalInput(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          <div>
            <Label>Priority</Label>
            <Input type="number" value={banner.priority} onChange={(e) => set("priority", Number(e.target.value) || 0)} hint="Higher shows first" />
          </div>
          {!isPopup && <Checkbox label="People can close it" checked={banner.dismissible} onChange={(v) => set("dismissible", v)} />}
          <Checkbox label="Switched on" checked={banner.active} onChange={(v) => set("active", v)} />
        </div>

        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !banner.message.trim()} onClick={handleSave}>
            {saving ? "Saving…" : bannerId === null ? "Create banner" : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="sticky top-24 space-y-3">
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">Preview</p>
          <BannerPreview banner={banner} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isPopup
              ? "A popup appears over the app the next time someone opens it, and only once."
              : "A banner sits at the top of the chosen screen until it is closed, switched off or its end time passes."}
          </p>
        </div>
      </div>
    </div>
  );
}
