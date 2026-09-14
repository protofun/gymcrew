import { useEffect, useState } from "react";

import { api, type ActivityHeatmap as ActivityHeatmapData } from "../../lib/api";

/** Day × hour event density over the last 30 days — helps answer "when are GymCrew users actually
 * active?". Rendered as a plain CSS grid (no charting library needed for this shape). */
export function ActivityHeatmap() {
  const [data, setData] = useState<ActivityHeatmapData | null>(null);

  useEffect(() => {
    api.getActivityHeatmap().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const max = Math.max(1, ...data.grid.flat());

  function cellColor(count: number): string {
    if (count === 0) return "bg-gray-100 dark:bg-white/5";
    const intensity = count / max;
    if (intensity > 0.75) return "bg-brand-600";
    if (intensity > 0.5) return "bg-brand-500";
    if (intensity > 0.25) return "bg-brand-400";
    return "bg-brand-200 dark:bg-brand-900";
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">Activity Heatmap</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">When GymCrew users are most active — last 30 days.</p>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="mb-1 flex gap-1 pl-10">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="w-6 shrink-0 text-center text-[10px] text-gray-400">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {data.days.map((day, dayIndex) => (
            <div key={day} className="mb-1 flex items-center gap-1">
              <div className="w-9 shrink-0 text-xs text-gray-500 dark:text-gray-400">{day}</div>
              {data.grid[dayIndex].map((count, hour) => (
                <div
                  key={hour}
                  title={`${day} ${hour}:00 — ${count} event${count === 1 ? "" : "s"}`}
                  className={`h-6 w-6 shrink-0 rounded-sm ${cellColor(count)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
