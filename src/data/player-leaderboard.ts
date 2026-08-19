import type { RankTier } from "@/lib/rank";

export type LeaderboardPlayer = {
  id: string;
  name: string;
  avatarUrl: string;
  rankTier: RankTier;
  power: number;
  gymName: string;
};

/** The user's home gym — until onboarding actually collects a gym choice, this is the one "Gym" scope filters to. */
export const MY_GYM_NAME = "Iron Paradise Gym";

const OTHER_GYM_NAME = "Beast Mode Fitness";

/** Individual player rankings for the Global/Gym leaderboard tabs. Seeded once; the current user is merged in at render time. */
export const PLAYER_LEADERBOARD: LeaderboardPlayer[] = [
  { id: "p1", name: "Viktor Nash", avatarUrl: "https://picsum.photos/seed/lb-viktor/128", rankTier: "legend", power: 9840, gymName: OTHER_GYM_NAME },
  { id: "p2", name: "Amara Diallo", avatarUrl: "https://picsum.photos/seed/lb-amara/128", rankTier: "immortal", power: 9210, gymName: OTHER_GYM_NAME },
  { id: "p3", name: "Deniz Aksoy", avatarUrl: "https://picsum.photos/seed/lb-deniz/128", rankTier: "mythic", power: 8640, gymName: OTHER_GYM_NAME },
  { id: "p4", name: "Priya Nair", avatarUrl: "https://picsum.photos/seed/lb-priya/128", rankTier: "titan", power: 8110, gymName: OTHER_GYM_NAME },
  { id: "p5", name: "Marco Silva", avatarUrl: "https://picsum.photos/seed/lb-marco/128", rankTier: "champion", power: 7530, gymName: MY_GYM_NAME },
  { id: "p6", name: "Yuki Tanaka", avatarUrl: "https://picsum.photos/seed/lb-yuki/128", rankTier: "grandmaster", power: 6980, gymName: OTHER_GYM_NAME },
  { id: "p7", name: "Sofia Kovac", avatarUrl: "https://picsum.photos/seed/lb-sofia/128", rankTier: "master", power: 6420, gymName: MY_GYM_NAME },
  { id: "p8", name: "Liam O'Connor", avatarUrl: "https://picsum.photos/seed/lb-liam/128", rankTier: "elite", power: 5870, gymName: OTHER_GYM_NAME },
  { id: "p9", name: "Chen Wei", avatarUrl: "https://picsum.photos/seed/lb-chen/128", rankTier: "diamond", power: 5310, gymName: MY_GYM_NAME },
  { id: "p10", name: "Elena Popescu", avatarUrl: "https://picsum.photos/seed/lb-elena/128", rankTier: "platinum", power: 4760, gymName: OTHER_GYM_NAME },
  { id: "p11", name: "Tariq Hassan", avatarUrl: "https://picsum.photos/seed/lb-tariq/128", rankTier: "gold", power: 4180, gymName: MY_GYM_NAME },
  { id: "p12", name: "Nora Lindqvist", avatarUrl: "https://picsum.photos/seed/lb-nora/128", rankTier: "silver", power: 3540, gymName: OTHER_GYM_NAME },
  { id: "p13", name: "Diego Ramirez", avatarUrl: "https://picsum.photos/seed/lb-diego/128", rankTier: "bronze", power: 2960, gymName: OTHER_GYM_NAME },
  { id: "p14", name: "Grace Mwangi", avatarUrl: "https://picsum.photos/seed/lb-grace/128", rankTier: "novice", power: 2310, gymName: OTHER_GYM_NAME },
];
