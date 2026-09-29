import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import { api, ApiError, type RankTier, type RankTierScope } from "../lib/api";

const TABS: { scope: RankTierScope; label: string; thresholdLabel: string; help: string }[] = [
  {
    scope: "player",
    label: "Player Divisions",
    thresholdLabel: "Min. power",
    help: "The individual leaderboard's division cutoffs, by power score. A player is placed in the highest division whose cutoff their power clears.",
  },
  {
    scope: "crew",
    label: "Crew Divisions",
    thresholdLabel: "XP to climb out",
    help: "How much XP a crew needs to climb out of each division into the next one. Apex is the final tier — nothing to climb out of, so its value is unused.",
  },
];

/** The player-leaderboard and crew-division rank ladders — used to be two separate hardcoded PHP
 * arrays on the backend, kept in sync with the client's own copy by hand. This is the one place to
 * edit the server-side values now. The app's own client copy (src/lib/division.ts) is NOT wired to
 * this yet — still needs updating by hand to match, if these are ever changed. */
export default function RankTiers() {
  const [scope, setScope] = useState<RankTierScope>("player");
  const [tiers, setTiers] = useState<RankTier[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  function load(nextScope: RankTierScope) {
    setLoading(true);
    api
      .getRankTiers(nextScope)
      .then((res) => {
        setTiers(res.tiers);
        setDrafts(Object.fromEntries(res.tiers.map((t) => [t.id, String(t.threshold)])));
      })
      .catch(() => toast.error("Failed to load rank tiers"))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(scope), [scope]);

  async function handleSave(tier: RankTier) {
    const raw = drafts[tier.id] ?? "";
    const threshold = parseInt(raw, 10);
    if (isNaN(threshold) || threshold < 0) {
      toast.error("Enter a whole non-negative number");
      return;
    }
    setSavingId(tier.id);
    try {
      await api.updateRankTier(tier.id, { threshold });
      toast.success(`${tier.name} updated`);
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, threshold } : t)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  const activeTab = TABS.find((t) => t.scope === scope)!;

  return (
    <>
      <PageMeta title="Rank Tiers | GymCrew Admin" description="Player and crew division ladders" />
      <PageBreadcrumb pageTitle="Rank Tiers" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{activeTab.help}</p>
      <p className="mb-6 max-w-2xl text-xs text-warning-500">
        Reminder: the app's own copy of this ladder (src/lib/division.ts) is separate and isn't updated automatically — mirror any change there too.
      </p>

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.scope}
            onClick={() => setScope(t.scope)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              scope === t.scope ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                {["#", "Division", activeTab.thresholdLabel, ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : (
                tiers.map((tier) => {
                  const dirty = drafts[tier.id] !== String(tier.threshold);
                  const isFinalCrewTier = scope === "crew" && tier.tierOrder === tiers.length - 1;
                  return (
                    <tr key={tier.id}>
                      <td className="px-5 py-3 text-sm text-gray-400">{tier.tierOrder + 1}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{tier.name}</td>
                      <td className="px-5 py-3">
                        <Input
                          type="number"
                          min="0"
                          disabled={isFinalCrewTier}
                          value={drafts[tier.id] ?? ""}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [tier.id]: e.target.value }))}
                          className="max-w-[160px]"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Button size="sm" variant="outline" disabled={!dirty || savingId === tier.id || isFinalCrewTier} onClick={() => handleSave(tier)}>
                          {savingId === tier.id ? "Saving…" : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
