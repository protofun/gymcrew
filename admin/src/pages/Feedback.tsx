import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import { api, type AdminFeedbackItem, type FeedbackStatus } from "../lib/api";

const STATUS_COLOR: Record<FeedbackStatus, "light" | "warning" | "error" | "success"> = {
  open: "light",
  planned: "warning",
  declined: "error",
  shipped: "success",
};

export default function Feedback() {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);

  function load() {
    api.getAdminFeedback().then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function handleStatusChange(item: AdminFeedbackItem, status: FeedbackStatus) {
    await api.updateAdminFeedback(item.id, status);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    toast.success(`Marked as ${status}`);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this feedback item?")) return;
    await api.deleteAdminFeedback(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  }

  return (
    <>
      <PageMeta title="Feedback Board | GymCrew Admin" description="Triage user feature requests" />
      <PageBreadcrumb pageTitle="Feedback Board" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Ideas users submitted and upvoted in the app. Accept one into the public Roadmap by hand once you&apos;ve decided to build it.
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No feedback submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center rounded-xl bg-gray-50 px-3 py-2 dark:bg-white/[0.05]">
                  <span className="text-lg font-semibold text-gray-800 dark:text-white/90">{item.votesCount}</span>
                  <span className="text-xs text-gray-400">votes</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.title}</p>
                  {item.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {item.userName} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge size="sm" color={STATUS_COLOR[item.status]}>
                  {item.status}
                </Badge>
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item, e.target.value as FeedbackStatus)}
                  className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
                >
                  <option value="open">Open</option>
                  <option value="planned">Planned</option>
                  <option value="declined">Declined</option>
                  <option value="shipped">Shipped</option>
                </select>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-error-500 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
