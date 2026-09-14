import { useEffect, useState } from "react";
import { Link } from "react-router";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { api, ApiError, type AdminAnalytics, type AdminReport } from "../lib/api";

const REASON_LABEL: Record<string, string> = {
  inappropriate_name: "Inappropriate name",
  inappropriate_photo: "Inappropriate photo",
  harassment: "Harassment or abuse",
  spam: "Spam",
  other: "Other",
};

export default function Reports() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getReports(filter)
      .then(setReports)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    api.getAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  async function resolve(report: AdminReport) {
    await api.resolveReport(report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  }

  const reasonChartOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#F04438"],
    chart: { fontFamily: "Outfit, sans-serif", height: 220, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: analytics?.reportsByReason.map((r) => REASON_LABEL[r.label] ?? r.label) ?? [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
  };

  return (
    <>
      <PageMeta title="Reports | GymCrew Admin" description="User-generated-content reports" />
      <PageBreadcrumb pageTitle="Reports" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Reports by Reason (all time)</h3>
        {!analytics || analytics.reportsByReason.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No reports have been filed yet — this chart fills in once users start reporting content.</p>
        ) : (
          <Chart options={reasonChartOptions} series={[{ name: "Reports", data: analytics.reportsByReason.map((r) => r.count) }]} type="bar" height={220} />
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={filter === "open" ? "primary" : "outline"} onClick={() => setFilter("open")}>
          Open
        </Button>
        <Button size="sm" variant={filter === "resolved" ? "primary" : "outline"} onClick={() => setFilter("resolved")}>
          Resolved
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Target</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reason</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Details</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reported By</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Date</TableCell>
                {filter === "open" && <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No {filter} reports right now. When a user reports a Crew or a member from inside the app, it shows up here.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Badge size="sm" color="light">
                        {report.targetType}
                      </Badge>{" "}
                      <Link to={report.targetType === "user" ? `/users/${report.targetId}` : `/crews/${report.targetId}`} className="text-brand-500 hover:underline">
                        {report.targetId}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{REASON_LABEL[report.reason] ?? report.reason}</TableCell>
                    <TableCell className="max-w-xs px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{report.details || "—"}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{report.reporterName}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                    {filter === "open" && (
                      <TableCell className="px-5 py-4 text-start text-theme-sm">
                        <Button size="sm" variant="outline" onClick={() => resolve(report)}>
                          Mark Resolved
                        </Button>
                      </TableCell>
                    )}
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
