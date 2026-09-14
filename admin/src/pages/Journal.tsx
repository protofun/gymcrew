import { Fragment, useEffect, useState } from "react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { SearchableSelect } from "../components/admin/SearchableSelect";
import { api, type AdminUserListItem, type EventLogEntry } from "../lib/api";

const LIMIT = 50;

/** Named "Journal", not "Event Log" — ad blockers commonly block any URL path containing "event"
 * as a generic analytics-tracking heuristic (confirmed: this page's requests were silently
 * blocked, zero response, before the underlying endpoint was renamed from /event-log to
 * /journal). Keep this in mind for any future route on this page. */
export default function Journal() {
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<AdminUserListItem | null>(null);
  const [eventType, setEventType] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.getEventTypes().then((res) => setEventTypes(res.eventTypes)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getEventLog({ userId: user?.id, eventType: eventType || undefined, search: search || undefined, page, limit: LIMIT })
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load the journal"))
      .finally(() => setLoading(false));
  }, [user, eventType, search, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  function clearFilters() {
    setUser(null);
    setEventType("");
    setSearch("");
    setPage(1);
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilters = user !== null || eventType !== "" || search !== "";

  return (
    <>
      <PageMeta title="Journal | GymCrew Admin" description="Every event the app has logged, filterable by user and type" />
      <PageBreadcrumb pageTitle="Journal" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">User</p>
          <SearchableSelect<AdminUserListItem>
            value={user}
            onSelect={(u) => {
              setUser(u);
              setPage(1);
            }}
            search={(q) => api.getUsers({ search: q, limit: 8 }).then((r) => r.users)}
            getId={(u) => u.id}
            getLabel={(u) => u.fullName || u.email || u.id}
            getSubLabel={(u) => u.email}
            placeholder="All users…"
          />
        </div>

        <div className="w-56">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Event Type</p>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Search event / screen</p>
            <Input placeholder="e.g. workout_completed" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline">
            Search
          </Button>
        </form>

        {hasFilters && (
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}

        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{total.toLocaleString()} events</span>
      </div>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Time</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">User</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Event</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Screen</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Session</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{""}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No events match these filters.</TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <TableRow>
                      <TableCell className="px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        {entry.userName ?? entry.userId ?? "—"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-start text-theme-sm">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
                          {entry.eventType}
                        </code>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{entry.screenName ?? "—"}</TableCell>
                      <TableCell className="px-5 py-3 text-start text-theme-sm text-gray-400">{entry.sessionId.slice(0, 18)}…</TableCell>
                      <TableCell className="px-5 py-3 text-start text-theme-sm">
                        {entry.properties && Object.keys(entry.properties).length > 0 && (
                          <button className="text-xs text-brand-500 hover:underline" onClick={() => toggleExpanded(entry.id)}>
                            {expanded.has(entry.id) ? "Hide" : "Details"}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded.has(entry.id) && entry.properties && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-5 py-3 dark:bg-white/[0.02]">
                          <pre className="overflow-x-auto text-xs text-gray-600 dark:text-gray-300">{JSON.stringify(entry.properties, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
