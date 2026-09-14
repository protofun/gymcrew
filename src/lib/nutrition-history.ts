import type { ApiFoodLog } from "@/lib/api";
import { toDateKey } from "@/lib/date";
import { dayHealthinessRatio } from "@/lib/nutrition-day-status";
import { sumMacros, type Macros } from "@/lib/nutrition-macros";

export type HistoryRange = "day" | "week" | "month";

export type HistoryPoint = { date: string; value: number };

/** How far back each range looks, and how points are grouped — "day" plots one point per day,
 * "week"/"month" plot the *average daily* value within each period (a straight sum would make a
 * bigger period look like a bigger spike rather than a trend). See NUTRITION.md section 23. */
const RANGE_CONFIG: Record<HistoryRange, { lookbackDays: number; periodDays: number }> = {
  day: { lookbackDays: 14, periodDays: 1 },
  week: { lookbackDays: 84, periodDays: 7 },
  month: { lookbackDays: 180, periodDays: 30 },
};

function dailyValueByDateKey(entries: ApiFoodLog[], pick: (entry: ApiFoodLog) => number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.dateKey, (totals.get(entry.dateKey) ?? 0) + pick(entry));
  }
  return totals;
}

/** Builds a chart-ready series for one macro (calories/protein/...) over `range`. Days with no
 * logged food are simply skipped rather than plotted as a false zero, same "don't show a fake dip"
 * reasoning the weight trend helper follows. */
function buildSeries(entries: ApiFoodLog[], range: HistoryRange, pick: (entry: ApiFoodLog) => number, now: Date = new Date()): HistoryPoint[] {
  const { lookbackDays, periodDays } = RANGE_CONFIG[range];
  const daily = dailyValueByDateKey(entries, pick);
  const startDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const points: HistoryPoint[] = [];
  for (let offset = 0; offset < lookbackDays; offset += periodDays) {
    const periodStart = new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000);
    let sum = 0;
    let daysWithData = 0;
    for (let d = 0; d < periodDays; d++) {
      const dateKey = toDateKey(new Date(periodStart.getTime() + d * 24 * 60 * 60 * 1000));
      const value = daily.get(dateKey);
      if (value !== undefined) {
        sum += value;
        daysWithData++;
      }
    }
    if (daysWithData > 0) {
      points.push({ date: toDateKey(periodStart), value: Math.round(sum / daysWithData) });
    }
  }
  return points;
}

export function caloriesHistory(entries: ApiFoodLog[], range: HistoryRange): HistoryPoint[] {
  return buildSeries(entries, range, (entry) => entry.calories);
}

export function proteinHistory(entries: ApiFoodLog[], range: HistoryRange): HistoryPoint[] {
  return buildSeries(entries, range, (entry) => entry.proteinG);
}

/**
 * One point per calendar month — the average `dayHealthinessRatio` (0-100%) across that month's
 * tracked days — for the History tab's "Monthly Healthiness" trend. Distinct from
 * calories/proteinHistory above: those plot raw logged amounts (what Progress already shows for the
 * current period), this plots how *on-target* each day actually was, over real calendar months
 * rather than a rolling window — a different question ("was I consistent") than "how much did I eat."
 * Months with no tracked days are skipped, same "don't plot a false dip" rule `buildSeries` follows.
 */
export function monthlyHealthinessHistory(entries: ApiFoodLog[], targets: Macros, monthsBack = 6, now: Date = new Date()): HistoryPoint[] {
  const entriesByDate = new Map<string, ApiFoodLog[]>();
  for (const entry of entries) entriesByDate.set(entry.dateKey, [...(entriesByDate.get(entry.dateKey) ?? []), entry]);

  const points: HistoryPoint[] = [];
  for (let monthsAgo = monthsBack - 1; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0).getDate();

    let totalRatio = 0;
    let trackedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (date > now) break;
      const dayEntries = entriesByDate.get(toDateKey(date));
      if (!dayEntries || dayEntries.length === 0) continue;
      const totals = sumMacros(dayEntries);
      if (totals.calories === 0) continue;
      trackedDays++;
      totalRatio += dayHealthinessRatio(totals, targets);
    }

    if (trackedDays > 0) {
      points.push({ date: toDateKey(monthStart), value: Math.round((totalRatio / trackedDays) * 100) });
    }
  }
  return points;
}
