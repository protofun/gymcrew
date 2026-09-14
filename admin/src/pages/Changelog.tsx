import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { api, type ChangelogEntry } from "../lib/api";

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.getChangelog().then(setEntries).catch(() => {});
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!version.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await api.createChangelogEntry({ version: version.trim(), title: title.trim(), description: description.trim() || undefined });
      toast.success("Published to the app's What's New screen");
      setVersion("");
      setTitle("");
      setDescription("");
      setShowForm(false);
      load();
    } catch {
      toast.error("Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this changelog entry?")) return;
    await api.deleteChangelogEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Deleted");
  }

  return (
    <>
      <PageMeta title="Changelog | GymCrew Admin" description="Manage the app's What's New screen" />
      <PageBreadcrumb pageTitle="Changelog" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Shown to users in the app under Profile → What&apos;s New.</p>

      <div className="mb-6 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Entry"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2">
          <div>
            <Label>Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.4.0" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Push notifications are here" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description (optional)</Label>
            <TextArea rows={3} value={description} onChange={setDescription} placeholder="What changed, in plain language…" />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={saving || !version.trim() || !title.trim()}>
              {saving ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No changelog entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">v{entry.version}</span>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{entry.title}</p>
                </div>
                {entry.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{entry.description}</p>}
                <p className="mt-2 text-xs text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleDelete(entry.id)} className="shrink-0 text-xs text-error-500 hover:underline">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
