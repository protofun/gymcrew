import { useEffect, useState } from "react";

import { api, type LiveNow } from "../../lib/api";

const POLL_INTERVAL_MS = 15000;

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">{value.toLocaleString()}</p>
    </div>
  );
}

/** The Dashboard's top-of-page "Launch Control Center" section — real-time counts, polled every
 * 15s. Every number here comes straight from live tables (see backend/routes/analytics-events.php's
 * respondWithLiveNow), never estimated. */
export function LiveNowSection() {
  const [live, setLive] = useState<LiveNow | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .getLiveNow()
        .then((data) => {
          if (!cancelled) setLive(data);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!live) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <LiveDot />
            <span className="text-xs font-semibold uppercase tracking-wide text-success-500">Live Now</span>
          </div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white/90">
            {live.usersOnline.toLocaleString()} <span className="text-lg font-medium text-gray-500 dark:text-gray-400">users online</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            +{live.newSessionsLast10Min} new session{live.newSessionsLast10Min === 1 ? "" : "s"} in the last 10 minutes ·{" "}
            {live.activeSessions} active session{live.activeSessions === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="New Users Today" value={live.newUsersToday} />
        <MiniStat label="Sessions Today" value={live.sessionsToday} />
        <MiniStat label="Workouts Started" value={live.workoutsStartedToday} />
        <MiniStat label="Workouts Completed" value={live.workoutsCompletedToday} />
        <MiniStat label="PRs Today" value={live.prsToday} />
        <MiniStat label="Crews Created" value={live.crewsCreatedToday} />
        <MiniStat label="Crew Joins Today" value={live.crewJoinsToday} />
        <MiniStat label="Meals Logged Today" value={live.mealsLoggedToday} />
      </div>
    </div>
  );
}
