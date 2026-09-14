import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import { api, type ActiveCrewWar } from "../lib/api";

export default function CrewWars() {
  const [wars, setWars] = useState<ActiveCrewWar[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getActiveCrewWars()
      .then(setWars)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleForceEnd(war: ActiveCrewWar) {
    if (!window.confirm(`Force-end the war between ${war.crewAName} and ${war.crewBName}?`)) return;
    await api.forceEndCrewWar(war.id);
    setWars((prev) => prev.filter((w) => w.id !== war.id));
    toast.success("War ended");
  }

  return (
    <>
      <PageMeta title="Crew Wars | GymCrew Admin" description="Moderate active crew wars" />
      <PageBreadcrumb pageTitle="Crew Wars" />

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : wars.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No active crew wars right now.</p>
      ) : (
        <div className="space-y-3">
          {wars.map((war) => {
            const total = war.crewAScore + war.crewBScore || 1;
            const aPct = (war.crewAScore / total) * 100;
            return (
              <div key={war.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800 dark:text-white/90">{war.crewAName}</span>
                  <span className="text-gray-400">vs</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{war.crewBName}</span>
                </div>
                <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
                  <div className="h-full bg-brand-500" style={{ width: `${aPct}%` }} />
                </div>
                <div className="mb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{war.crewAScore.toLocaleString()} kg</span>
                  <span>Ends {new Date(war.endsAt).toLocaleDateString()}</span>
                  <span>{war.crewBScore.toLocaleString()} kg</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleForceEnd(war)}>
                  Force End War
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
