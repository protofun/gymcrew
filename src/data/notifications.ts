import { Ionicons } from "@expo/vector-icons";

export type AppNotification = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: "1", icon: "trophy", title: "New PR! Your bench press went up to 82.5kg.", time: "2 hours ago" },
  { id: "2", icon: "people", title: "Sanne joined your crew.", time: "5 hours ago" },
  { id: "3", icon: "flame", title: "You're on a 4-day streak. Keep it going!", time: "Yesterday" },
  { id: "4", icon: "trending-up", title: "You got 6% stronger this month.", time: "2 days ago" },
];
