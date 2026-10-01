import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import { api, type AdminEmailEntry, type EmailSource } from "../lib/api";

const SOURCES: { value: EmailSource; label: string; hint: string }[] = [
  { value: "users", label: "App users", hint: "Real GymCrew accounts" },
  { value: "founding_athletes", label: "Founding athletes", hint: "Marketing-site athlete signups" },
  { value: "waitlist", label: "Waitlist", hint: "Landing-page waitlist" },
  { value: "support", label: "Support", hint: "Contact email left on a support ticket" },
  { value: "contacts", label: "Saved contacts", hint: "Your own outreach list" },
  { value: "admins", label: "Admins", hint: "Admin-panel accounts" },
];
const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.value, s.label])) as Record<EmailSource, string>;
// Admin accounts are your own team — rarely who you want in a mass mailing, so off until asked for.
const DEFAULT_SOURCES: EmailSource[] = ["users", "founding_athletes", "waitlist", "support", "contacts"];

type Preset = "all" | "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

const SEPARATORS = [
  { value: ", ", label: "Comma" },
  { value: "; ", label: "Semicolon (Outlook)" },
  { value: "\n", label: "New line" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_LIMIT = 200;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** [from, to) in epoch ms for a preset, in the admin's local timezone. `null` bound = unbounded. */
function presetRange(preset: Preset, customFrom: string, customTo: string): [number | null, number | null] {
  const today = startOfDay(Date.now());
  switch (preset) {
    case "today":
      return [today, null];
    case "yesterday":
      return [today - DAY_MS, today];
    case "7d":
      return [today - 6 * DAY_MS, null];
    case "30d":
      return [today - 29 * DAY_MS, null];
    case "90d":
      return [today - 89 * DAY_MS, null];
    case "custom": {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null;
      const to = customTo ? new Date(`${customTo}T00:00:00`).getTime() + DAY_MS : null;
      return [from, to];
    }
    default:
      return [null, null];
  }
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

type Row = { email: string; sources: EmailSource[]; name: string | null; createdAt: number };

/** Every email address stored anywhere in the database (users, founding athletes, waitlist, support
 * tickets, saved contacts, admins) in one filterable list, with one-click copy for mass mailing. */
export default function EmailAddresses() {
  const [entries, setEntries] = useState<AdminEmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<EmailSource[]>(DEFAULT_SOURCES);
  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [dedupe, setDedupe] = useState(true);
  const [separator, setSeparator] = useState(", ");
  const [showAll, setShowAll] = useState(false);

  function load() {
    setLoading(true);
    api
      .getAdminEmails()
      .then((res) => setEntries(res.emails))
      .catch(() => toast.error("Failed to load email addresses"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.source] = (c[e.source] ?? 0) + 1;
    return c;
  }, [entries]);

  const uniqueTotal = useMemo(() => new Set(entries.map((e) => e.email)).size, [entries]);

  // Filtering happens on the raw entries first (source + date + search), THEN optionally collapses
  // duplicates — so "waitlist, last 7 days" never hides an address just because the same one also
  // exists in an older users row.
  const rows: Row[] = useMemo(() => {
    const [from, to] = presetRange(preset, customFrom, customTo);
    const q = search.trim().toLowerCase();
    const matching = entries.filter((e) => {
      if (!sources.includes(e.source)) return false;
      if (from !== null && e.createdAt < from) return false;
      if (to !== null && e.createdAt >= to) return false;
      if (q && !`${e.email} ${e.name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (!dedupe) return matching.map((e) => ({ email: e.email, sources: [e.source], name: e.name, createdAt: e.createdAt }));

    const byEmail = new Map<string, Row>();
    for (const e of matching) {
      const existing = byEmail.get(e.email);
      if (!existing) {
        byEmail.set(e.email, { email: e.email, sources: [e.source], name: e.name, createdAt: e.createdAt });
      } else {
        if (!existing.sources.includes(e.source)) existing.sources.push(e.source);
        if (!existing.name && e.name) existing.name = e.name;
        existing.createdAt = Math.max(existing.createdAt, e.createdAt);
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, sources, preset, customFrom, customTo, search, dedupe]);

  // Signups per day over the last 14 days for the currently selected sources — a quick read on
  // whether the list is actually growing before you decide on a timeframe.
  const perDay = useMemo(() => {
    const today = startOfDay(Date.now());
    const days = Array.from({ length: 14 }, (_, i) => ({ start: today - (13 - i) * DAY_MS, count: 0 }));
    for (const e of entries) {
      if (!sources.includes(e.source)) continue;
      const idx = Math.floor((startOfDay(e.createdAt) - days[0].start) / DAY_MS);
      if (idx >= 0 && idx < days.length) days[idx].count += 1;
    }
    return days;
  }, [entries, sources]);
  const maxPerDay = Math.max(1, ...perDay.map((d) => d.count));

  const uniqueEmails = useMemo(() => Array.from(new Set(rows.map((r) => r.email))), [rows]);
  const joined = uniqueEmails.join(separator);
  const visibleRows = showAll ? rows : rows.slice(0, ROW_LIMIT);

  function toggleSource(source: EmailSource) {
    setSources((prev) => (prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]));
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't access the clipboard — select the text in the box and copy it manually");
    }
  }

  function exportCsv() {
    const lines = ["email,name,sources,date", ...rows.map((r) => [r.email, r.name ?? "", r.sources.map((s) => SOURCE_LABEL[s]).join(" + "), new Date(r.createdAt).toISOString()].map(csvCell).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gymcrew-emails-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const multiSourceCount = rows.filter((r) => r.sources.length > 1).length;

  return (
    <>
      <PageMeta title="Email Addresses | GymCrew Admin" description="Every email address in the database" />
      <PageBreadcrumb pageTitle="Email Addresses" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Every email address stored in the database — app users, founding athletes, the waitlist, support tickets, your saved contacts and admins. Filter by table and time, then copy them all in one go.
      </p>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Unique addresses (all tables)" value={uniqueTotal} />
        <Stat label="Matching your filters" value={uniqueEmails.length} highlight />
        <Stat label="Appear in 2+ tables" value={multiSourceCount} hint={dedupe ? undefined : "turn on “Merge duplicates”"} />
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">New per day · last 14 days</p>
          <div className="mt-2 flex h-10 items-end gap-1">
            {perDay.map((d) => (
              <div
                key={d.start}
                title={`${new Date(d.start).toLocaleDateString()}: ${d.count}`}
                className="flex-1 rounded-sm bg-brand-500/70"
                style={{ height: `${Math.max(d.count > 0 ? 12 : 4, (d.count / maxPerDay) * 100)}%`, opacity: d.count > 0 ? 1 : 0.25 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Table</p>
            <div className="flex gap-3 text-xs">
              <button className="text-brand-500 hover:underline" onClick={() => setSources(SOURCES.map((s) => s.value))}>
                Select all
              </button>
              <button className="text-gray-500 hover:underline dark:text-gray-400" onClick={() => setSources([])}>
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const active = sources.includes(s.value);
              return (
                <button
                  key={s.value}
                  title={s.hint}
                  onClick={() => toggleSource(s.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {s.label} <span className="ml-1 text-xs opacity-70">{counts[s.value] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Signed up</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  preset === p.value ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div>
                <p className="mb-1 text-xs text-gray-500">From</p>
                <Input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="w-44" />
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-500">To (inclusive)</p>
                <Input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="w-44" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Input placeholder="Search email or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
            Merge duplicates across tables
          </label>
        </div>
      </div>

      {/* Copy box */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {uniqueEmails.length} unique {uniqueEmails.length === 1 ? "address" : "addresses"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {SEPARATORS.map((s) => (
                <option key={s.label} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={load}>
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => copy(joined, `Copied ${uniqueEmails.length} addresses`)} disabled={uniqueEmails.length === 0}>
              Copy all
            </Button>
          </div>
        </div>
        <textarea
          readOnly
          value={joined}
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          placeholder={loading ? "Loading…" : "No addresses match these filters"}
          className="w-full rounded-lg border border-gray-300 bg-transparent p-3 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Found in</th>
                <th className="px-5 py-3 font-medium">{dedupe ? "Latest" : "Added"}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No addresses match these filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={`${r.email}-${r.sources.join()}-${r.createdAt}`}>
                    <td className="px-5 py-3 text-gray-800 dark:text-white/90">{r.email}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{r.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.sources.map((s) => (
                          <Badge key={s} size="sm" color={s === "users" ? "success" : s === "waitlist" ? "warning" : s === "founding_athletes" ? "primary" : "light"}>
                            {SOURCE_LABEL[s]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-xs text-brand-500 hover:underline" onClick={() => copy(r.email, "Copied")}>
                        Copy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length > ROW_LIMIT && (
          <div className="border-t border-gray-100 px-5 py-3 text-center text-sm dark:border-white/[0.05]">
            <button className="text-brand-500 hover:underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show only the first ${ROW_LIMIT}` : `Show all ${rows.length} rows`}
            </button>
            <span className="ml-2 text-gray-500">(Copy all and Export always include every match)</span>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, highlight, hint }: { label: string; value: number; highlight?: boolean; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? "text-brand-500" : "text-gray-800 dark:text-white/90"}`}>{value.toLocaleString()}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
