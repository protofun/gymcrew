import { useEffect, useState } from "react";

import { api, type Insight } from "../../lib/api";

const SEVERITY_STYLE: Record<Insight["severity"], string> = {
  warning: "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10",
  info: "border-blue-light-200 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/10",
};

const SEVERITY_ICON: Record<Insight["severity"], string> = {
  warning: "⚠️",
  info: "ℹ️",
};

/** Rule-based, data-only insights — see backend/routes/launch-analytics.php's respondWithInsights
 * for the exact thresholds. Never invents a conclusion: renders nothing (not even the card) when
 * the backend returns zero triggered insights. */
export function NeedsAttentionCard() {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .getInsights()
      .then((res) => {
        setInsights(res.insights);
        setNote(res.note);
      })
      .catch(() => setInsights([]));
  }, []);

  if (!insights || (insights.length === 0 && !note)) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Needs Attention</h3>
      {note ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{note}</p>
      ) : insights.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nothing unusual detected right now.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border p-4 ${SEVERITY_STYLE[insight.severity]}`}>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {SEVERITY_ICON[insight.severity]} {insight.title}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{insight.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
