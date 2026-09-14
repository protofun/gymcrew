import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { ActivityHeatmap } from "../components/dashboard/ActivityHeatmap";
import { LiveNowSection } from "../components/dashboard/LiveNowSection";
import { NeedsAttentionCard } from "../components/dashboard/NeedsAttentionCard";
import { api, ApiError, type AdminAnalytics, type DashboardStats } from "../lib/api";

function StatCard({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const content = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block transition hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

function ChartCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
      {empty ? <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p> : children}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load stats"));
    api.getAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const signupsOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#c8de00"],
    chart: { fontFamily: "Outfit, sans-serif", height: 280, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    dataLabels: { enabled: false },
    grid: { xaxis: { lines: { show: false } } },
    xaxis: { categories: stats?.signupsByDay?.map((d) => d.date) ?? [], axisBorder: { show: false }, axisTicks: { show: false } },
    tooltip: { x: { format: "dd MMM" } },
  };

  const workoutsOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 260, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    dataLabels: { enabled: false },
    grid: { xaxis: { lines: { show: false } } },
    xaxis: { categories: analytics?.workoutsByDay.map((d) => d.date) ?? [], axisBorder: { show: false }, axisTicks: { show: false } },
  };

  const privacyOptions: ApexOptions = {
    labels: analytics?.crewsByPrivacy.map((d) => d.label) ?? [],
    colors: ["#465FFF", "#F79009", "#12B76A"],
    chart: { fontFamily: "Outfit, sans-serif" },
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
  };

  const divisionOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#7A5AF8"],
    chart: { fontFamily: "Outfit, sans-serif", height: 260, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: analytics?.crewsByDivision.map((d) => d.label) ?? [] },
  };

  return (
    <>
      <PageMeta title="Dashboard | GymCrew Admin" description="GymCrew admin dashboard" />
      <PageBreadcrumb pageTitle="Dashboard" />

      <LiveNowSection />
      <NeedsAttentionCard />
      <div className="mb-6">
        <ActivityFeed />
      </div>
      <div className="mb-6">
        <ActivityHeatmap />
      </div>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {!stats ? (
        !error && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} to="/users" />
            <StatCard label="New Users (7d)" value={stats.newUsers7d.toLocaleString()} to="/users" />
            <StatCard label="Total Crews" value={stats.totalCrews.toLocaleString()} to="/crews" />
            <StatCard label="Banned Users" value={stats.bannedUsers.toLocaleString()} to="/users" />
            <StatCard label="Total Workouts Logged" value={stats.totalWorkouts.toLocaleString()} />
            <StatCard label="Workouts (7d)" value={stats.workouts7d.toLocaleString()} />
            <StatCard label="Open Reports" value={stats.openReports.toLocaleString()} to="/reports" />
            <StatCard label="Open Support Messages" value={stats.openSupport.toLocaleString()} to="/support" />
          </div>

          <ChartCard title="Signups — last 30 days" empty={(stats.signupsByDay?.length ?? 0) === 0}>
            <Chart options={signupsOptions} series={[{ name: "Signups", data: stats.signupsByDay?.map((d) => d.count) ?? [] }]} type="area" height={280} />
          </ChartCard>

          <ChartCard title="Workouts Logged — last 14 days" empty={!analytics || analytics.workoutsByDay.length === 0}>
            <Chart options={workoutsOptions} series={[{ name: "Workouts", data: analytics?.workoutsByDay.map((d) => d.count) ?? [] }]} type="bar" height={260} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Crews by Privacy" empty={!analytics || analytics.crewsByPrivacy.length === 0}>
              <Chart options={privacyOptions} series={analytics?.crewsByPrivacy.map((d) => d.count) ?? []} type="donut" height={280} />
            </ChartCard>
            <ChartCard title="Crews by Division" empty={!analytics || analytics.crewsByDivision.length === 0}>
              <Chart options={divisionOptions} series={[{ name: "Crews", data: analytics?.crewsByDivision.map((d) => d.count) ?? [] }]} type="bar" height={280} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
