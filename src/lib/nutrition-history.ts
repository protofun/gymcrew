import type { ApiFoodLog } from "@/lib/api";
import { toDateKey } from "@/lib/date";

export type HistoryRange = "day" | "week" | "month";

export const HISTORY_RANGES: { key: HistoryRange; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export type HistoryPoint = { date: string; value: number };

/** How far back each range looks, and how points are grouped — "day" plots one point per day,
 * "week"/"month" plot the *average daily* value within each period (a straight sum would make a
 * bigger period look like a bigger spike rather than a trend). See NUTRITION.md section 23. */
const RANGE_CONFIG: Record<HistoryRange, { lookbackDays: number; periodDays: number }> = {
  day: { lookbackDays: 14, periodDays: 1 },
  week: { lookbackDays: 84, periodDays: 7 },
  month: { lookbackDays: 180, periodDays: 30 },
};

export function historyStartDateKey(range: HistoryRange, now: Date = new Date()): string {
  const { lookbackDays } = RANGE_CONFIG[range];
  return toDateKey(new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000));
}

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
