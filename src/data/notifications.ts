import type { ImageSourcePropType } from "react-native";

export type AppNotification = {
  id: string;
  /** A rank-tier medal for PRs, a streak icon for streak nudges — see lib/notifications.ts. */
  icon: ImageSourcePropType;
  title: string;
  time: string;
  timestamp: number;
  /** Set only for PR notifications — tapping one opens that workout's summary. */
  workoutId?: string;
};
