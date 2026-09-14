import { useEffect, useState, type FormEvent } from "react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { api, ApiError, type AdminAnnouncement } from "../lib/api";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.getAnnouncements().then(setAnnouncements).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load announcements"));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createAnnouncement(message.trim());
      setMessage("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish announcement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: number) {
    await api.deactivateAnnouncement(id);
    load();
  }

  return (
    <>
      <PageMeta title="Announcements | GymCrew Admin" description="Manage the app's home-screen announcement banner" />
      <PageBreadcrumb pageTitle="Page Management" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">Announcement History</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Only one announcement is ever shown in the app at a time — the active one.</p>
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-white/[0.05]">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-white/90">{a.message}</p>
                    <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge size="sm" color={a.active ? "success" : "light"}>
                      {a.active ? "Active" : "Inactive"}
                    </Badge>
                    {a.active && (
                      <Button size="sm" variant="outline" onClick={() => handleDeactivate(a.id)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Publish New Banner</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Message</Label>
              <TextArea rows={4} value={message} onChange={setMessage} placeholder="e.g. Scheduled maintenance tonight 22:00–23:00 CET" />
            </div>
            {error && <p className="text-sm text-error-500">{error}</p>}
            <Button className="w-full" size="sm" disabled={saving || !message.trim()}>
              {saving ? "Publishing…" : "Publish"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
