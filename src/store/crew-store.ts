import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceDivision, type Division } from "@/lib/division";

export type CrewRole = "leader" | "co-leader" | "member";

export type CrewMember = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  level: number;
  role: CrewRole;
  isAdmin: boolean;
  isOnline: boolean;
};

export type TodayPlan = {
  workoutName: string;
  memberIdsTraining: string[];
};

export type CrewPrivacy = "invite-only" | "open" | "public";

export type CrewNotificationPrefs = {
  workoutReminders: boolean;
  prAlerts: boolean;
  challengeUpdates: boolean;
};

/** Stands in for the signed-in user's own membership row until real auth-linked membership exists. */
export const CURRENT_MEMBER_ID = "m1";

export type DivisionHistoryEntry = { division: Division; reachedAt: number };
export type DivisionCelebration = { from: Division; to: Division };

type CrewState = {
  name: string;
  tagline: string;
  icon: string;
  createdAt: number;
  division: Division;
  /** Every division reached so far, oldest first, with when the crew first got there — powers the
   * Stats tab's division timeline. The final entry is the crew's current division. */
  divisionHistory: DivisionHistoryEntry[];
  /** Set the moment `addXp` pushes the crew into a new division; the UI shows a celebration overlay
   * and clears it via `clearDivisionCelebration`. */
  pendingDivisionCelebration: DivisionCelebration | null;
  /** e.g. 25 → "top 25% of crews in your division". */
  divisionTopPercentile: number;
  globalRank: number;
  region: string;
  xp: number;
  crewPower: number;
  crewPowerChangePercent: number;
  maxMembers: number;
  members: CrewMember[];
  todayPlan: TodayPlan;
  privacy: CrewPrivacy;
  joinRequestsEnabled: boolean;
  trainingType: string;
  subscriptionActive: boolean;
  notifications: CrewNotificationPrefs;
};

type CrewActions = {
  removeMember: (id: string) => void;
  setMemberRole: (id: string, role: CrewRole) => void;
  toggleMemberAdmin: (id: string) => void;
  /** Adds crew XP (e.g. a completed challenge reward), rolling over into the next division if it fills the bar. */
  addXp: (amount: number) => void;
  clearDivisionCelebration: () => void;
  updateInfo: (updates: { name?: string; tagline?: string }) => void;
  setIcon: (icon: string) => void;
  setPrivacy: (privacy: CrewPrivacy) => void;
  toggleJoinRequests: () => void;
  setTrainingType: (trainingType: string) => void;
  setMaxMembers: (maxMembers: number) => void;
  toggleNotification: (key: keyof CrewNotificationPrefs) => void;
  /** Removes the current user from the crew — their challenge progress (a separate store) is untouched. */
  leaveCrew: () => void;
  /** Re-adds the current user after choosing/creating a crew again post-leave — a no-op if they're already a member (e.g. first-time onboarding). */
  rejoin: (crewName: string, memberName: string) => void;
};

// Approximate — there's no real historical XP log, so past division dates are backfilled once at
// seed time. The growing gaps between them mirror the real ladder's increasing XP requirements, so
// the Stats tab's timeline tells a believable "gets harder" story.
const DEFAULT_DIVISION_HISTORY: DivisionHistoryEntry[] = [
  { division: "Rookie", reachedAt: Date.UTC(2023, 9, 15) },
  { division: "Novice", reachedAt: Date.UTC(2023, 9, 26) },
  { division: "Bronze", reachedAt: Date.UTC(2023, 10, 12) },
  { division: "Silver", reachedAt: Date.UTC(2023, 11, 18) },
  { division: "Gold", reachedAt: Date.UTC(2024, 1, 24) },
  { division: "Platinum", reachedAt: Date.UTC(2024, 5, 12) },
  { division: "Diamond", reachedAt: Date.UTC(2024, 10, 29) },
  { division: "Elite", reachedAt: Date.UTC(2025, 6, 30) },
];

// Placeholder faces (picsum.photos, seeded per member so they stay stable across reloads)
// until real member avatars are wired up to profiles.
const DEFAULT_CREW: CrewState = {
  name: "Iron Squad",
  tagline: "Stronger together.",
  icon: "gorilla",
  createdAt: Date.UTC(2023, 9, 15),
  division: "Elite",
  divisionHistory: DEFAULT_DIVISION_HISTORY,
  pendingDivisionCelebration: null,
  divisionTopPercentile: 25,
  globalRank: 128,
  region: "Europe",
  xp: 4250,
  crewPower: 28540,
  crewPowerChangePercent: 5.6,
  maxMembers: 6,
  members: [
    {
      id: "m1",
      name: "Jaimy",
      username: "jaimybeast",
      avatarUrl: "https://picsum.photos/seed/iron-squad-1/128",
      level: 24,
      role: "leader",
      isAdmin: true,
      isOnline: true,
    },
    {
      id: "m2",
      name: "Sam",
      username: "samlifts",
      avatarUrl: "https://picsum.photos/seed/iron-squad-2/128",
      level: 22,
      role: "co-leader",
      isAdmin: true,
      isOnline: true,
    },
    {
      id: "m3",
      name: "Robin",
      username: "robingainz",
      avatarUrl: "https://picsum.photos/seed/iron-squad-3/128",
      level: 20,
      role: "member",
      isAdmin: false,
      isOnline: false,
    },
    {
      id: "m4",
      name: "Noa",
      username: "noastrong",
      avatarUrl: "https://picsum.photos/seed/iron-squad-4/128",
      level: 19,
      role: "member",
      isAdmin: false,
      isOnline: true,
    },
    {
      id: "m5",
      name: "Kai",
      username: "kaypush",
      avatarUrl: "https://picsum.photos/seed/iron-squad-5/128",
      level: 18,
      role: "member",
      isAdmin: false,
      isOnline: true,
    },
  ],
  todayPlan: {
    workoutName: "Leg Day",
    memberIdsTraining: ["m1", "m2", "m3", "m4"],
  },
  privacy: "invite-only",
  joinRequestsEnabled: true,
  trainingType: "Powerlifting",
  subscriptionActive: true,
  notifications: {
    workoutReminders: true,
    prAlerts: true,
    challengeUpdates: true,
  },
};

export const useCrewStore = create<CrewState & CrewActions>()(
  persist(
    (set) => ({
      ...DEFAULT_CREW,
      removeMember: (id) => set((state) => ({ members: state.members.filter((member) => member.id !== id) })),
      setMemberRole: (id, role) =>
        set((state) => ({ members: state.members.map((member) => (member.id === id ? { ...member, role } : member)) })),
      toggleMemberAdmin: (id) =>
        set((state) => ({
          members: state.members.map((member) => (member.id === id ? { ...member, isAdmin: !member.isAdmin } : member)),
        })),
      addXp: (amount) =>
        set((state) => {
          const result = advanceDivision(state.xp, state.division, amount);
          if (!result.leveledUp) return { xp: result.xp };

          return {
            xp: result.xp,
            division: result.division,
            divisionHistory: [...state.divisionHistory, { division: result.to, reachedAt: Date.now() }],
            pendingDivisionCelebration: { from: result.from, to: result.to },
          };
        }),
      clearDivisionCelebration: () => set({ pendingDivisionCelebration: null }),
      updateInfo: (updates) =>
        set((state) => ({
          name: updates.name?.trim() ? updates.name.trim() : state.name,
          tagline: updates.tagline !== undefined ? updates.tagline : state.tagline,
        })),
      setIcon: (icon) => set({ icon }),
      setPrivacy: (privacy) => set({ privacy }),
      toggleJoinRequests: () => set((state) => ({ joinRequestsEnabled: !state.joinRequestsEnabled })),
      setTrainingType: (trainingType) => set({ trainingType }),
      setMaxMembers: (maxMembers) => set({ maxMembers }),
      toggleNotification: (key) =>
        set((state) => ({ notifications: { ...state.notifications, [key]: !state.notifications[key] } })),
      leaveCrew: () => set((state) => ({ members: state.members.filter((member) => member.id !== CURRENT_MEMBER_ID) })),
      rejoin: (crewName, memberName) =>
        set((state) => {
          const alreadyMember = state.members.some((member) => member.id === CURRENT_MEMBER_ID);
          if (alreadyMember) return { name: crewName.trim() || state.name };

          const username = (memberName || "you").toLowerCase().replace(/[^a-z0-9]/g, "") || "you";
          const newMember: CrewMember = {
            id: CURRENT_MEMBER_ID,
            name: memberName.trim() || "You",
            username,
            avatarUrl: "https://picsum.photos/seed/iron-squad-1/128",
            level: 1,
            role: "member",
            isAdmin: false,
            isOnline: true,
          };

          return { name: crewName.trim() || state.name, members: [...state.members, newMember] };
        }),
    }),
    {
      name: "gymcrew-crew",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
