import { useEffect, useState } from "react";

import { api, type ActivityFeedEntry } from "../../lib/api";
import { formatTimeAgo } from "../../lib/format";

const POLL_INTERVAL_MS = 15000;

const TYPE_ICON: Record<ActivityFeedEntry["type"], string> = {
  user_registered: "👋",
  crew_created: "🚩",
  crew_joined: "🤝",
  workout_completed: "💪",
  pr_achieved: "🏆",
  meal_logged: "🍽️",
};

function describe(entry: ActivityFeedEntry): string {
  switch (entry.type) {
    case "user_registered":
      return `${entry.userName} joined GymCrew`;
    case "crew_created":
      return `${entry.userName} created "${entry.detail}"`;
    case "crew_joined":
      return `${entry.userName} joined "${entry.detail}"`;
    case "workout_completed":
      return `${entry.userName} completed "${entry.detail}"`;
    case "pr_achieved":
      return `${entry.userName} hit a new ${entry.detail} PR`;
    case "meal_logged":
      return `${entry.userName} logged "${entry.detail}"`;
    default:
      return `${entry.userName} did something`;
  }
}

/** Auto-refreshing feed of real events, merged server-side from six source tables — see
 * backend/routes/analytics-events.php's respondWithActivityFeed. */
export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityFeedEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .getActivityFeed()
        .then((res) => {
          if (!cancelled) setEntries(res.entries);
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Live Activity</h3>
      {!entries ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
      ) : (
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-800">
              <span className="text-base">{TYPE_ICON[entry.type] ?? "•"}</span>
              <span className="flex-1 text-gray-700 dark:text-gray-300">{describe(entry)}</span>
              <span className="shrink-0 text-xs text-gray-400">{formatTimeAgo(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
