import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { api, ApiError, type EventsOverview, type LaunchPeriod, type LaunchPerformance, type ProductFunnel, type PwaAdoption } from "../lib/api";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
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

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

const SENTRY_URL = (import.meta.env.VITE_SENTRY_URL as string | undefined) || "https://sentry.io";

const STEP_LABEL: Record<string, string> = {
  accountCreated: "Account Created",
  nameSet: "Name Entered",
  usernameSet: "Username Chosen",
  bodyStatsSet: "Body Stats Entered",
  gymSet: "Gym Set",
  goalSet: "Goal Set",
};

function ToolCard({ title, description, url, cta }: { title: string; description: string; url: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        {cta} ↗
      </a>
    </div>
  );
}

const PERIODS: { key: LaunchPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "all", label: "All Time" },
];

export default function Analytics() {
  const [funnel, setFunnel] = useState<{ step: string; count: number }[]>([]);
  const [events, setEvents] = useState<EventsOverview | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [period, setPeriod] = useState<LaunchPeriod>("7d");
  const [launchPerf, setLaunchPerf] = useState<LaunchPerformance | null>(null);
  const [launchPerfError, setLaunchPerfError] = useState<string | null>(null);
  const [productFunnel, setProductFunnel] = useState<ProductFunnel | null>(null);
  const [pwaAdoption, setPwaAdoption] = useState<PwaAdoption | null>(null);

  useEffect(() => {
    api.getOnboardingFunnel().then(setFunnel).catch(() => {});
    api
      .getEventsOverview()
      .then(setEvents)
      .catch((err) => setEventsError(err instanceof ApiError ? err.message : "Failed to load analytics"));
    api.getProductFunnel().then(setProductFunnel).catch(() => {});
    api.getPwaAdoption().then(setPwaAdoption).catch(() => {});
  }, []);

  useEffect(() => {
    setLaunchPerf(null);
    setLaunchPerfError(null);
    api
      .getLaunchPerformance(period)
      .then(setLaunchPerf)
      .catch((err) => setLaunchPerfError(err instanceof ApiError ? err.message : "Failed to load launch performance"));
  }, [period]);

  const funnelOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#465FFF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 280, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: false } },
    dataLabels: { enabled: true },
    xaxis: { categories: funnel.map((f) => STEP_LABEL[f.step] ?? f.step) },
  };

  const activeUsersOptions: ApexOptions = {
    legend: { show: false },
    colors: ["#c8de00"],
    chart: { fontFamily: "Outfit, sans-serif", height: 260, type: "area", toolbar: { show: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    dataLabels: { enabled: false },
    grid: { xaxis: { lines: { show: false } } },
    xaxis: {
      categories: events?.activeUsersTrend.map((d) => d.date) ?? [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    tooltip: { x: { format: "dd MMM" } },
  };

  function horizontalBarOptions(categories: string[]): ApexOptions {
    return {
      legend: { show: false },
      colors: ["#7A5AF8"],
      chart: { fontFamily: "Outfit, sans-serif", height: 260, type: "bar", toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      dataLabels: { enabled: false },
      xaxis: { categories },
    };
  }

  function lineOptions(categories: string[], color: string): ApexOptions {
    return {
      legend: { show: false },
      colors: [color],
      chart: { fontFamily: "Outfit, sans-serif", height: 240, type: "line", toolbar: { show: false } },
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { xaxis: { lines: { show: false } } },
      xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    };
  }

  return (
    <>
      <PageMeta title="Analytics | GymCrew Admin" description="Onboarding funnel, first-party product analytics, plus a link to Sentry" />
      <PageBreadcrumb pageTitle="Analytics & Errors" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Launch Performance</h3>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  period === p.key ? "bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {launchPerfError ? (
          <p className="text-sm text-error-500">Couldn&apos;t load launch performance: {launchPerfError}</p>
        ) : !launchPerf ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Early Access Users" value={launchPerf.totalUsers.toLocaleString()} />
              <StatCard
                label="New Users"
                value={
                  launchPerf.newUsersChangePercent === null
                    ? launchPerf.newUsersInPeriod.toLocaleString()
                    : `${launchPerf.newUsersInPeriod.toLocaleString()} (${launchPerf.newUsersChangePercent >= 0 ? "+" : ""}${launchPerf.newUsersChangePercent}%)`
                }
              />
              <StatCard label="Daily Active Users" value={launchPerf.dau.toLocaleString()} />
              <StatCard label="Weekly Active Users" value={launchPerf.wau.toLocaleString()} />
              <StatCard label="Returning Users" value={launchPerf.returningUsersInPeriod.toLocaleString()} />
              <StatCard label="Avg Session Duration" value={formatDuration(launchPerf.avgSessionDurationSeconds)} />
              <StatCard label="Sessions Per User" value={launchPerf.sessionsPerUser.toLocaleString()} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ChartCard title="Users Over Time" empty={launchPerf.usersOverTime.length === 0}>
                <Chart
                  options={lineOptions(launchPerf.usersOverTime.map((d) => d.date), "#465FFF")}
                  series={[{ name: "Total Users", data: launchPerf.usersOverTime.map((d) => d.count) }]}
                  type="line"
                  height={240}
                />
              </ChartCard>
              <ChartCard title="Daily Active Users" empty={launchPerf.dailyActiveUsers.length === 0}>
                <Chart
                  options={lineOptions(launchPerf.dailyActiveUsers.map((d) => d.date), "#c8de00")}
                  series={[{ name: "DAU", data: launchPerf.dailyActiveUsers.map((d) => d.count) }]}
                  type="line"
                  height={240}
                />
              </ChartCard>
              <ChartCard title="New Users Per Day" empty={launchPerf.newUsersPerDay.length === 0}>
                <Chart
                  options={lineOptions(launchPerf.newUsersPerDay.map((d) => d.date), "#7A5AF8")}
                  series={[{ name: "New Users", data: launchPerf.newUsersPerDay.map((d) => d.count) }]}
                  type="line"
                  height={240}
                />
              </ChartCard>
            </div>
          </div>
        )}
      </div>

      {productFunnel && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">User Funnel</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">What Early Access users actually do after signing up.</p>

          {productFunnel.biggestDropOff && (
            <div className="mb-4 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-600 dark:text-warning-400">Biggest Drop-off</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {productFunnel.biggestDropOff.dropOffPercent}% of users who reach &quot;{productFunnel.biggestDropOff.fromLabel}&quot; never
                reach &quot;{productFunnel.biggestDropOff.toLabel}&quot;.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {productFunnel.stages.map((stage) => (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm text-gray-600 dark:text-gray-300">{stage.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${stage.conversionPercent}%` }} />
                </div>
                <span className="w-32 shrink-0 text-right text-sm text-gray-500 dark:text-gray-400">
                  {stage.count.toLocaleString()} ({stage.conversionPercent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">Onboarding Funnel</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">How many accounts have completed each onboarding step, in order.</p>
        {funnel.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data yet.</p>
        ) : (
          <Chart options={funnelOptions} series={[{ name: "Accounts", data: funnel.map((f) => f.count) }]} type="bar" height={280} />
        )}
      </div>

      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Product Analytics</h3>
      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Our own — the app reports screen views and key actions straight to this backend (see src/lib/analytics.ts and
        backend/routes/track.php), stored in our own database. No third-party analytics service involved.
      </p>

      {eventsError ? (
        <div className="mb-6 rounded-2xl border border-error-500 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500">
          Couldn&apos;t load product analytics: {eventsError}. If you just deployed this feature, make sure{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">backend/db/schema.sql</code> has been re-imported (it adds the{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">analytics_events</code> table) and that{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">routes/track.php</code> and{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">routes/analytics-events.php</code> were uploaded.
        </div>
      ) : !events ? (
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="mb-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Avg Session Duration" value={formatDuration(events.avgSessionDurationSeconds)} />
            <StatCard label="Top Screen" value={events.topScreens[0]?.label ?? "—"} />
            <StatCard label="Top Action" value={events.topActions[0]?.label ?? "—"} />
          </div>

          <ChartCard title="Active Users — last 14 days" empty={events.activeUsersTrend.length === 0}>
            <Chart
              options={activeUsersOptions}
              series={[{ name: "Active Users", data: events.activeUsersTrend.map((d) => d.count) }]}
              type="area"
              height={260}
            />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Top Screens — last 7 days" empty={events.topScreens.length === 0}>
              <Chart
                options={horizontalBarOptions(events.topScreens.map((s) => s.label))}
                series={[{ name: "Views", data: events.topScreens.map((s) => s.count) }]}
                type="bar"
                height={260}
              />
            </ChartCard>
            <ChartCard title="Top Actions — last 7 days" empty={events.topActions.length === 0}>
              <Chart
                options={horizontalBarOptions(events.topActions.map((s) => s.label))}
                series={[{ name: "Times triggered", data: events.topActions.map((s) => s.count) }]}
                type="bar"
                height={260}
              />
            </ChartCard>
          </div>
        </div>
      )}

      {pwaAdoption && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">PWA Adoption</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Early Access runs as a PWA, not a native app — how many users have actually installed it?
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-4 content-start">
              <StatCard label="Installed" value={pwaAdoption.installed.toLocaleString()} />
              <StatCard label="Not Installed" value={pwaAdoption.notInstalled.toLocaleString()} />
              <StatCard label="Installation Rate" value={`${pwaAdoption.installationRatePercent}%`} />
              <StatCard label="PWA Opens" value={pwaAdoption.pwaOpens.toLocaleString()} />
              <StatCard label="iOS Installs" value={pwaAdoption.iosInstalls.toLocaleString()} />
              <StatCard label="Android Installs" value={pwaAdoption.androidInstalls.toLocaleString()} />
              <StatCard label="Mobile Users" value={pwaAdoption.mobileUsers.toLocaleString()} />
              <StatCard label="Desktop Users" value={pwaAdoption.desktopUsers.toLocaleString()} />
            </div>
            <ChartCard title="Installed vs. Not Installed" empty={pwaAdoption.totalUsers === 0}>
              <Chart
                options={{
                  labels: ["Installed", "Not Installed"],
                  colors: ["#12B76A", "#D0D5DD"],
                  chart: { fontFamily: "Outfit, sans-serif" },
                  legend: { position: "bottom" },
                  dataLabels: { enabled: true },
                }}
                series={[pwaAdoption.installed, pwaAdoption.notInstalled]}
                type="donut"
                height={280}
              />
            </ChartCard>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ToolCard
          title="Sentry — Crash & Error Tracking"
          description="Real-time crash reports and error stack traces from the app (see src/config/sentry.ts)."
          url={SENTRY_URL}
          cta="Open Sentry"
        />
      </div>

      <p className="mt-6 text-xs text-gray-400">Set VITE_SENTRY_URL in admin/.env.local to point this at your exact Sentry project.</p>
    </>
  );
}
