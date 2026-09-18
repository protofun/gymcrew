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
    id: "division-rival-count-fix",
    publishedAtMs: Date.UTC(2026, 8, 18),
    type: "bug",
    title: "Fixed rival count on the Division Info screen",
    description:
      "The \"Battles vs N Rival Crews\" line on your Division Info screen could show a different number than the real Leaderboard. It now always matches — both pull from the same live crew standings.",
  },
  {
    id: "onboarding-rank-reveal",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "feature",
    title: "Instant Rank Reveal in Onboarding",
    description:
      "Right after entering your bench, squat, and deadlift, you now get the full medal-reveal moment — glow, confetti, haptics — showing your estimated rank for each lift. Clearly marked as an estimate: log a real set after your first workout to make it official.",
  },
  {
    id: "rank-reveal-animation",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "feature",
    title: "A Bigger Rank Reveal",
    description:
      "Hitting a new rank or a PR is now an actual moment — a building glow, the medal turning to face you, then a confetti burst and a haptic buzz as it lands. Same rank info as before, just worth celebrating.",
  },
  {
    id: "in-app-crew-notifications",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "feature",
    title: "In-App Notifications",
    description:
      "Crew activity (PRs, division-ups) and app announcements that come in while you're using GymCrew now show up as a quick on-brand notification inside the app instead of a generic system banner.",
  },
  {
    id: "smoother-sheets-and-pickers",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "update",
    title: "Smoother Popups Across the App",
    description:
      "Option menus, pickers, and sheets (workout options, exercise actions, filters, crew activity, today's workout, and more) now support swipe-to-dismiss and feel snappier to open and close.",
  },
  {
    id: "refreshed-charts-and-calendars",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "update",
    title: "Refreshed Graphs & Date Pickers",
    description:
      "Strength trend graphs and date pickers got a smoother redesign under the hood — scrubbing through your progress and picking a date should feel nicer without anything changing about what they show.",
  },
  {
    id: "faster-feeling-home-screen",
    publishedAtMs: Date.UTC(2026, 8, 15),
    type: "update",
    title: "Faster-Feeling Home Screen",
    description:
      "The Home tab now shows a preview of the layout while your data loads instead of a blank spinner, so it feels quicker to open.",
  },
  {
    id: "body-graph-history",
    publishedAtMs: Date.UTC(2026, 8, 14),
    type: "feature",
    title: "Body Graph History",
    description:
      "The Body Graph now has a history view — pick any past date and see your muscle-group ranks then vs. now side by side, with a breakdown of exactly which groups ranked up.",
  },
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
