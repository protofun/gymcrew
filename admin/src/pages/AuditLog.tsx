import { useEffect, useState } from "react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { api, type AuditLogEntry } from "../lib/api";

const ACTION_COLOR: Record<string, "success" | "error" | "warning" | "light"> = {
  login: "light",
  ban_user: "error",
  unban_user: "success",
  delete_user: "error",
  disable_crew: "warning",
  enable_crew: "success",
  delete_crew: "error",
  update_report: "success",
  update_support: "success",
  create_admin: "warning",
  delete_admin: "error",
  publish_announcement: "light",
};

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getAuditLog(page)
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <>
      <PageMeta title="Audit Log | GymCrew Admin" description="Every consequential admin action" />
      <PageBreadcrumb pageTitle="Audit Log" />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Admin</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Action</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Target</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Details</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">When</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Nothing logged yet.</TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{entry.adminEmail}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Badge size="sm" color={ACTION_COLOR[entry.action] ?? "light"}>
                        {entry.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {entry.targetType ? `${entry.targetType}: ${entry.targetId}` : "—"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{entry.details || "—"}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
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
