export type ChangelogEntryType = "feature" | "bug" | "update";

export type ChangelogEntry = {
  id: string;
  /** Epoch ms, same convention as everywhere else dates are stored (see workout-history-store.ts). */
  publishedAtMs: number;
  type: ChangelogEntryType;
  title: string;
  description: string;
};

/** Newest first — top of the list renders first. Add new entries to the top when shipping. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "log-a-past-workout",
    publishedAtMs: Date.UTC(2026, 8, 14),
    type: "feature",
    title: "Log a Past Workout",
    description:
      "Forgot to log a day? Use the new date picker on the Log tab to backfill it. It still shows up in your history and heatmap, but never counts toward XP, streaks, personal records, or Crew War — so there's no way to farm points by filling in old days after the fact.",
  },
  {
    id: "crew-level-display-fix",
    publishedAtMs: Date.UTC(2026, 8, 14),
    type: "bug",
    title: "Fixed inflated levels on the Crew page",
    description:
      "The Crew members list and member profile were showing huge, incorrect \"LVL\" numbers — actually raw XP mislabeled as a level. Both now correctly show your real division (e.g. Novice) instead.",
  },
];
