import { useEffect, useState, type FormEvent } from "react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import TextArea from "../components/form/input/TextArea";
import { api, type AdminRoadmapItem, type RoadmapStatus } from "../lib/api";

const COLUMNS: { status: RoadmapStatus; label: string; color: "light" | "warning" | "success" }[] = [
  { status: "planned", label: "Planned", color: "light" },
  { status: "in_progress", label: "In Progress", color: "warning" },
  { status: "shipped", label: "Shipped", color: "success" },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "shipped", label: "Shipped" },
];

export default function Roadmap() {
  const [items, setItems] = useState<AdminRoadmapItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<RoadmapStatus>("planned");

  function load() {
    api.getRoadmap().then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createRoadmapItem({ title: title.trim(), description: description.trim() || undefined, status });
    setTitle("");
    setDescription("");
    setStatus("planned");
    setShowForm(false);
    load();
  }

  async function handleMove(item: AdminRoadmapItem, nextStatus: RoadmapStatus) {
    await api.updateRoadmapItem(item.id, { status: nextStatus });
    load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this roadmap item?")) return;
    await api.deleteRoadmapItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <>
      <PageMeta title="Roadmap | GymCrew Admin" description="Manage the public GymCrew roadmap" />
      <PageBreadcrumb pageTitle="Roadmap" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Visible to users inside the GymCrew app too (Profile → What&apos;s Coming). Move an item
        between columns as it progresses.
      </p>

      <div className="mb-6 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Item"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Apple Health sync" />
          </div>
          <div>
            <Label>Status</Label>
            <Select options={STATUS_OPTIONS} defaultValue={status} onChange={(v) => setStatus(v as RoadmapStatus)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description (optional)</Label>
            <TextArea rows={2} value={description} onChange={setDescription} placeholder="What this actually means for users…" />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={!title.trim()}>
              Add to Roadmap
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.status} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</h3>
              <Badge size="sm" color={col.color}>
                {items.filter((i) => i.status === col.status).length}
              </Badge>
            </div>
            <div className="flex flex-col gap-3">
              {items
                .filter((i) => i.status === col.status)
                .map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-dark">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.title}</p>
                    {item.description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <select
                        value={item.status}
                        onChange={(e) => handleMove(item, e.target.value as RoadmapStatus)}
                        className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-error-500 hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
