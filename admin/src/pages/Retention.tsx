import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, ApiError, type Retention as RetentionData } from "../lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function Retention() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRetention()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load retention"));
  }, []);

  const measured = data?.retention.filter((r) => r.retainedPercent !== null) ?? [];

  const chartOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#12B76A"],
    chart: { fontFamily: "Outfit, sans-serif", height: 280, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "40%" } },
    dataLabels: { enabled: true, formatter: (v) => `${v}%` },
    yaxis: { max: 100 },
    xaxis: { categories: measured.map((r) => `Day ${r.day}`) },
  };

  return (
    <>
      <PageMeta title="Retention | GymCrew Admin" description="Are people actually coming back after trying GymCrew?" />
      <PageBreadcrumb pageTitle="Retention" />

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {!data ? (
        !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Returning Users" value={data.returningUsers.toLocaleString()} />
            {data.retention.map((r) => (
              <StatCard
                key={r.day}
                label={`Day ${r.day} Retention`}
                value={r.retainedPercent === null ? "No data yet" : `${r.retainedPercent}% (of ${r.cohortSize})`}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Retention Curve</h3>
            {measured.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Not enough data yet — day-N retention needs accounts old enough for that many days to have passed since signup.
              </p>
            ) : (
              <Chart options={chartOptions} series={[{ name: "Retained", data: measured.map((r) => r.retainedPercent ?? 0) }]} type="bar" height={280} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
