import type { Ionicons } from "@expo/vector-icons";

/** Other crews' power scores for the crew leaderboard — the current user's crew (from crew-store) is merged in and sorted alongside these. */
export const OTHER_CREWS_POWER: { name: string; power: number; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { name: "Beast Mode", power: 32450, icon: "flame", tint: "#FF6D00" },
  { name: "Iron Addicts", power: 30210, icon: "barbell", tint: "#E3FF00" },
  { name: "Gym Kings", power: 29480, icon: "shield", tint: "#EDEFF2" },
  { name: "Lifting Legends", power: 26410, icon: "trophy", tint: "#EDEFF2" },
  { name: "Reps Over Rest", power: 24830, icon: "flash", tint: "#EDEFF2" },
  { name: "Muscle Mafia", power: 23120, icon: "skull", tint: "#EDEFF2" },
  { name: "No Days Off", power: 21710, icon: "infinite", tint: "#FF3B30" },
];
