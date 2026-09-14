import type { ImageSourcePropType } from "react-native";

export type NotificationCategory = "pr" | "streak" | "crew" | "reminder";

export type AppNotification = {
  id: string;
  /** A rank-tier medal for PRs, a streak icon for streak nudges — see lib/notifications.ts. */
  icon: ImageSourcePropType;
  title: string;
  time: string;
  timestamp: number;
  /** Drives the "view all" screen's type filter — see app/notifications/index.tsx. */
  category: NotificationCategory;
  /** Set only for PR notifications — tapping one opens that workout's summary. */
  workoutId?: string;
};
