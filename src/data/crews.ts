import type { Ionicons } from "@expo/vector-icons";

export const EXISTING_CREWS: {
  name: string;
  members: number;
  maxMembers: number;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}[] = [
  { name: "Beast Mode", members: 24, maxMembers: 30, category: "Global", icon: "flame", tint: "#FF6D00" },
  { name: "Iron Addicts", members: 18, maxMembers: 20, category: "Powerlifting", icon: "barbell", tint: "#E3FF00" },
  { name: "Cardio Kings", members: 32, maxMembers: 40, category: "Cardio", icon: "heart", tint: "#EDEFF2" },
  { name: "Street Warriors", members: 15, maxMembers: 20, category: "Calisthenics", icon: "flash", tint: "#EDEFF2" },
];
