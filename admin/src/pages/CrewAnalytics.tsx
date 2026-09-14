import { useEffect, useState } from "react";
import { Link } from "react-router";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, ApiError, type CrewAnalytics as CrewAnalyticsData } from "../lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function CrewAnalytics() {
  const [data, setData] = useState<CrewAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCrewAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load crew analytics"));
  }, []);

  return (
    <>
      <PageMeta title="Crew Analytics | GymCrew Admin" description="Is the competitive/social part of GymCrew actually working?" />
      <PageBreadcrumb pageTitle="Crew Analytics" />

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {!data ? (
        !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Crews" value={data.totalCrews.toLocaleString()} />
            <StatCard label="New Crews Today" value={data.newCrewsToday.toLocaleString()} />
            <StatCard label="Avg Crew Size" value={data.avgCrewSize} />
            <StatCard label="Largest Crew" value={data.largestCrewSize} />
            <StatCard label="Most Active Crew" value={data.mostActiveCrew ?? "—"} />
            <StatCard label="Invites Sent" value={data.invitesSent.toLocaleString()} />
            <StatCard label="Invites Accepted" value={data.invitesAccepted.toLocaleString()} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Top Crews</h3>
            {data.topCrews.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Crew</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Workouts</th>
                      <th className="px-4 py-3">PRs</th>
                      <th className="px-4 py-3">Activity (7d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCrews.map((crew, i) => (
                      <tr key={crew.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">#{i + 1}</td>
                        <td className="px-4 py-3">
                          <Link to={`/crews/${crew.id}`} className="font-medium text-brand-500 hover:underline">
                            {crew.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{crew.members}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{crew.workouts}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{crew.prs}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{crew.recentActivity} workouts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
