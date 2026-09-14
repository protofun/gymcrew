import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, ApiError, type RankingAnalytics as RankingAnalyticsData } from "../lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function RankingAnalytics() {
  const [data, setData] = useState<RankingAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRankingAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load ranking analytics"));
  }, []);

  const divisionOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#7A5AF8"],
    chart: { fontFamily: "Outfit, sans-serif", height: 420, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: data?.divisionDistribution.map((d) => d.label) ?? [] },
  };

  return (
    <>
      <PageMeta title="Ranking Analytics | GymCrew Admin" description="Rank and gamification engagement across GymCrew" />
      <PageBreadcrumb pageTitle="Ranking Analytics" />

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {!data ? (
        !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Rank Page Views" value={data.rankPageViews.toLocaleString()} />
            <StatCard label="Rank Calculations" value={data.rankCalculations.toLocaleString()} />
            <StatCard label="PRs Today" value={data.prsToday.toLocaleString()} />
            <StatCard label="Total PRs" value={data.totalPrs.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Division Distribution</h3>
              {data.divisionDistribution.every((d) => d.count === 0) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
              ) : (
                <Chart
                  options={divisionOptions}
                  series={[{ name: "Users", data: data.divisionDistribution.map((d) => d.count) }]}
                  type="bar"
                  height={420}
                />
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Most Improved Users (30 days)</h3>
              {data.mostImproved.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Previous</th>
                        <th className="px-4 py-3">Current</th>
                        <th className="px-4 py-3">Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mostImproved.map((u) => (
                        <tr key={u.userId} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                          <td className="px-4 py-3 text-gray-800 dark:text-white/90">{u.userName}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.previousDivision}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.currentDivision}</td>
                          <td className="px-4 py-3 text-success-500">+{u.improvement} tier{u.improvement === 1 ? "" : "s"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
