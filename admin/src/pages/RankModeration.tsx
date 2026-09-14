import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { api, type TopRecord } from "../lib/api";

export default function RankModeration() {
  const [records, setRecords] = useState<TopRecord[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getTopRecords(100)
      .then(setRecords)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(record: TopRecord) {
    if (!window.confirm(`Delete ${record.userName}'s ${record.exerciseName} PR (${record.weightKg}kg)? This can't be undone.`)) return;
    await api.deleteRecord(record.userId, record.exerciseId);
    setRecords((prev) => prev.filter((r) => !(r.userId === record.userId && r.exerciseId === record.exerciseId)));
    toast.success("Record deleted");
  }

  return (
    <>
      <PageMeta title="Rank Moderation | GymCrew Admin" description="Review the heaviest logged PRs" />
      <PageBreadcrumb pageTitle="Rank Moderation" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        The 100 heaviest personal records across the app, sorted highest first — not an automated cheat detector (a genuinely
        strong lifter will show up here too), just a sorted list to eyeball and spot-check. Deleting a record here removes it
        from that user&apos;s PRs and the leaderboard; it doesn&apos;t touch their workout history.
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">User</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Exercise</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Weight</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reps</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Date</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={`${r.userId}-${r.exerciseId}`}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Link to={`/users/${r.userId}`} className="text-gray-800 hover:underline dark:text-white/90">
                        {r.userName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{r.exerciseName}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800 dark:text-white/90">{r.weightKg}kg</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{r.reps}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{new Date(r.achievedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <button onClick={() => handleDelete(r)} className="text-xs text-error-500 hover:underline">
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
