import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Checkbox from "../components/form/input/Checkbox";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { api, ApiError } from "../lib/api";

const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

function ControlCard({
  title,
  description,
  status,
  saving,
  onSave,
  children,
}: {
  title: string;
  description: string;
  status?: ReactNode;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        {status}
      </div>
      <div className="space-y-4">{children}</div>
      <div className="mt-5 flex justify-end">
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/** Switches that change how the whole app behaves, without shipping a new version. They are stored as
 * app_settings and read by the app on launch (see backend/routes/app-config.php). */
export default function AppControls() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setValues).catch(() => toast.error("Failed to load the current settings"));
  }, []);

  if (!values) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  const get = (key: string, fallback = "") => values[key] ?? fallback;
  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const text = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value);

  async function save(section: string, keys: string[]) {
    setSaving(section);
    try {
      for (const key of keys) await api.updateSetting(key, values?.[key] ?? "");
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  const maintenanceOn = get("maintenance_enabled") === "1";
  const scanOn = get("ai_scan_enabled", "1") !== "0";
  const minVersion = get("min_app_version");

  function saveMaintenance() {
    if (maintenanceOn && !window.confirm("Turn on maintenance mode? Everyone using the app will be blocked until you turn it off again.")) return;
    save("maintenance", ["maintenance_enabled", "maintenance_message"]);
  }

  function saveUpdate() {
    if (minVersion && !VERSION_PATTERN.test(minVersion)) {
      toast.error('The version should look like "1.2.0"');
      return;
    }
    if (minVersion && !window.confirm(`Apps older than ${minVersion} will be blocked until they update. Continue?`)) return;
    save("update", ["min_app_version", "update_message", "update_url_ios", "update_url_android"]);
  }

  function saveScan() {
    const limit = get("ai_scan_daily_limit").trim();
    if (limit !== "" && !/^\d+$/.test(limit)) {
      toast.error("The daily limit must be a whole number");
      return;
    }
    save("scan", ["ai_scan_enabled", "ai_scan_daily_limit"]);
  }

  return (
    <>
      <PageMeta title="App Controls | GymCrew Admin" description="Remote switches for the app" />
      <PageBreadcrumb pageTitle="App Controls" />

      <p className="mb-6 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Switches that change how the whole app behaves, without releasing a new version. The app checks them every time it is opened
        (and when it comes back to the foreground).
      </p>

      <div className="grid max-w-3xl grid-cols-1 gap-6">
        <ControlCard
          title="Maintenance mode"
          description="Blocks the whole app behind a message — for a database migration or an outage. People can retry from that screen."
          status={<Badge size="sm" color={maintenanceOn ? "error" : "success"}>{maintenanceOn ? "On" : "Off"}</Badge>}
          saving={saving === "maintenance"}
          onSave={saveMaintenance}
        >
          <Checkbox label="Maintenance mode is on" checked={maintenanceOn} onChange={(v) => set("maintenance_enabled", v ? "1" : "0")} />
          <div>
            <Label>Message shown to users</Label>
            <TextArea rows={3} value={get("maintenance_message")} onChange={(v) => set("maintenance_message", v)} placeholder="We're making GymCrew better. Back in about 30 minutes." />
          </div>
        </ControlCard>

        <ControlCard
          title="Required update"
          description="Apps older than this version are blocked until they update from the store. Leave empty to require nothing. Doesn't apply to the web version."
          status={minVersion ? <Badge size="sm" color="warning">Min {minVersion}</Badge> : <Badge size="sm" color="light">Not required</Badge>}
          saving={saving === "update"}
          onSave={saveUpdate}
        >
          <div>
            <Label>Minimum version</Label>
            <Input value={minVersion} onChange={text("min_app_version")} placeholder="e.g. 1.2.0" />
          </div>
          <div>
            <Label>Message (optional)</Label>
            <TextArea rows={2} value={get("update_message")} onChange={(v) => set("update_message", v)} placeholder="A new version of GymCrew is available with important fixes." />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>App Store link</Label>
              <Input value={get("update_url_ios")} onChange={text("update_url_ios")} placeholder="https://apps.apple.com/…" />
            </div>
            <div>
              <Label>Play Store link</Label>
              <Input value={get("update_url_android")} onChange={text("update_url_android")} placeholder="https://play.google.com/…" />
            </div>
          </div>
        </ControlCard>

        <ControlCard
          title="AI meal scan"
          description="The photo scan uses a shared AI quota. Switch it off to stop all scanning at once, or change how many scans each person gets per day."
          status={<Badge size="sm" color={scanOn ? "success" : "error"}>{scanOn ? "On" : "Off"}</Badge>}
          saving={saving === "scan"}
          onSave={saveScan}
        >
          <Checkbox label="AI meal scan is available" checked={scanOn} onChange={(v) => set("ai_scan_enabled", v ? "1" : "0")} />
          <div className="max-w-[200px]">
            <Label>Scans per person per day</Label>
            <Input type="number" min="0" value={get("ai_scan_daily_limit")} onChange={text("ai_scan_daily_limit")} placeholder="5" />
          </div>
        </ControlCard>
      </div>
    </>
  );
}
