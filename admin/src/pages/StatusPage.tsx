import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Radio from "../components/form/input/Radio";
import Input from "../components/form/input/InputField";
import { api, type StatusUpdate, type SystemStatus } from "../lib/api";

const STATUS_LABEL: Record<SystemStatus, { label: string; color: "success" | "warning" | "error" }> = {
  operational: { label: "Operational", color: "success" },
  degraded: { label: "Degraded Performance", color: "warning" },
  down: { label: "Down", color: "error" },
};

export default function StatusPage() {
  const [history, setHistory] = useState<StatusUpdate[]>([]);
  const [status, setStatus] = useState<SystemStatus>("operational");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.getStatusHistory().then(setHistory).catch(() => {});
  }
  useEffect(load, []);

  const current = history[0];

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStatusUpdate(status, message.trim() || undefined);
      toast.success("Status updated");
      setMessage("");
      load();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageMeta title="System Status | GymCrew Admin" description="Manage the public system status" />
      <PageBreadcrumb pageTitle="System Status" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Current status</p>
        {current ? (
          <div className="flex items-center gap-3">
            <Badge size="md" color={STATUS_LABEL[current.status].color}>
              {STATUS_LABEL[current.status].label}
            </Badge>
            {current.message && <span className="text-sm text-gray-600 dark:text-gray-300">{current.message}</span>}
          </div>
        ) : (
          <Badge size="md" color="success">
            Operational (default)
          </Badge>
        )}
      </div>

      <form onSubmit={handlePost} className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2">
        <div>
          <Label>New Status</Label>
          <div className="flex flex-col gap-3 pt-1">
            {(Object.keys(STATUS_LABEL) as SystemStatus[]).map((s) => (
              <Radio key={s} id={`status-${s}`} name="status" value={s} checked={status === s} onChange={() => setStatus(s)} label={STATUS_LABEL[s].label} />
            ))}
          </div>
        </div>
        <div>
          <Label>Message (optional)</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Investigating slow sync times" />
          <div className="mt-4">
            <Button size="sm" disabled={saving}>
              {saving ? "Posting…" : "Post Update"}
            </Button>
          </div>
        </div>
      </form>

      <h3 className="mb-3 text-base font-medium text-gray-800 dark:text-white/90">History</h3>
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <Badge size="sm" color={STATUS_LABEL[entry.status].color}>
                {STATUS_LABEL[entry.status].label}
              </Badge>
              {entry.message && <span className="text-sm text-gray-600 dark:text-gray-300">{entry.message}</span>}
            </div>
            <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
