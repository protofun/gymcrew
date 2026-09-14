import { useEffect, useState } from "react";
import { Link } from "react-router";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { api, ApiError, type AdminSupportMessage } from "../../lib/api";

export default function SupportList() {
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getSupportMessages(filter)
      .then(setMessages)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load support messages"))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <>
      <PageMeta title="Support | GymCrew Admin" description="In-app support conversations" />
      <PageBreadcrumb pageTitle="Support Inbox" />

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={filter === "open" ? "primary" : "outline"} onClick={() => setFilter("open")}>
          Open
        </Button>
        <Button size="sm" variant={filter === "resolved" ? "primary" : "outline"} onClick={() => setFilter("resolved")}>
          Resolved
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No {filter} tickets right now — this is normal early on, not a sign anything&apos;s broken. New "Report a Problem" messages from the app show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <Link
              key={message.id}
              to={`/support/${message.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{message.userName}</p>
                <div className="flex items-center gap-3">
                  <Badge size="sm" color={message.status === "open" ? "warning" : "success"}>
                    {message.status}
                  </Badge>
                  <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{message.message}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
