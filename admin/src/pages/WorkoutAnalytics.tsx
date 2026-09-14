import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, ApiError, type WorkoutAnalytics as WorkoutAnalyticsData } from "../lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default function WorkoutAnalytics() {
  const [data, setData] = useState<WorkoutAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWorkoutAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load workout analytics"));
  }, []);

  const muscleOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 280, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: data?.topMuscleGroups.map((m) => m.label) ?? [] },
  };

  return (
    <>
      <PageMeta title="Workout Analytics | GymCrew Admin" description="GymCrew-specific workout statistics" />
      <PageBreadcrumb pageTitle="Workout Analytics" />

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {!data ? (
        !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Workouts" value={data.totalWorkouts.toLocaleString()} />
            <StatCard label="Workouts Today" value={data.workoutsToday.toLocaleString()} />
            <StatCard label="Workouts This Week" value={data.workoutsThisWeek.toLocaleString()} />
            <StatCard label="Avg Workouts / User" value={data.avgWorkoutsPerUser} />
            <StatCard label="Avg Workout Duration" value={formatDuration(data.avgDurationSeconds)} />
            <StatCard label="Exercises Logged" value={data.exercisesLogged.toLocaleString()} />
            <StatCard label="Sets Logged" value={data.setsLogged.toLocaleString()} />
            <StatCard label="Reps Logged" value={data.repsLogged.toLocaleString()} />
            <StatCard label="Total Volume" value={`${data.totalVolumeKg.toLocaleString()} kg`} />
            <StatCard label="PRs Achieved" value={data.prsAchieved.toLocaleString()} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Most Popular Exercises</h3>
            {data.topExercises.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Exercise</th>
                      <th className="px-4 py-3">Users</th>
                      <th className="px-4 py-3">Sets</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">PRs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topExercises.map((ex) => (
                      <tr key={ex.exerciseName} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                        <td className="px-4 py-3 text-gray-800 dark:text-white/90">{ex.exerciseName}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ex.users}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ex.sets}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ex.volumeKg.toLocaleString()} kg</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ex.prs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Most Popular Muscle Groups</h3>
            {data.topMuscleGroups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
            ) : (
              <Chart
                options={muscleOptions}
                series={[{ name: "Intensity", data: data.topMuscleGroups.map((m) => m.count) }]}
                type="bar"
                height={280}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
