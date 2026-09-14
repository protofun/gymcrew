import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import { api } from "../lib/api";

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReportCard({ title, description, onExport }: { title: string; description: string; onExport: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onExport();
      toast.success("Download started");
    } catch {
      toast.error("Failed to generate export");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      <Button size="sm" variant="outline" className="mt-4" onClick={handleClick} disabled={loading}>
        {loading ? "Generating…" : "Download CSV"}
      </Button>
    </div>
  );
}

export default function ReportsCenter() {
  return (
    <>
      <PageMeta title="Reports Center | GymCrew Admin" description="Export GymCrew data as CSV" />
      <PageBreadcrumb pageTitle="Reports Center" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ReportCard
          title="Users"
          description="Every real user account — email, name, gym, goal, status, join date."
          onExport={async () => downloadCsv("gymcrew-users.csv", await api.exportUsers())}
        />
        <ReportCard
          title="Crews"
          description="Every real crew — name, privacy, division, XP, member count, status."
          onExport={async () => downloadCsv("gymcrew-crews.csv", await api.exportCrews())}
        />
        <ReportCard
          title="Workout Summary"
          description="Per-user totals — workout count and total volume logged, ranked highest first."
          onExport={async () => downloadCsv("gymcrew-workout-summary.csv", await api.exportWorkoutSummary())}
        />
      </div>
    </>
  );
}
