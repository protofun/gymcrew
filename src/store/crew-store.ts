import { getClerkInstance } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceDivision, type Division } from "@/lib/division";
import { api, type ApiCrew, isApiConfigured } from "@/lib/api";

export type CrewRole = "leader" | "co-leader" | "member";

export type CrewMember = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  /** Real total XP (see backend/routes/crews.php, joined from `profile_level`) — NOT a small 1-30
   * "level" number, despite the field name kept for UI-label compatibility. Use `division` below
   * for their real rank, never `divisionForMemberLevel(level)` (that formula assumes the old mock
   * level scale and produces nonsense against real XP totals). */
  level: number;
  division: Division;
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

/** Stands in for "whichever member row is the signed-in user" — real crew data now comes from the
 * backend keyed by real Clerk user ids (see backend/routes/crews.php), but every screen that reads
 * crew members was written against this fixed local id. `normalizeCrew` below remaps whichever
 * member's real id matches the signed-in user's own Clerk id back to this constant on the way in,
 * so all of those screens keep working unchanged — only your OWN row is ever remapped, other real
 * members keep their real ids (which is what kicking/etc. actually needs). */
export const CURRENT_MEMBER_ID = "m1";
/** Id for the curated "boss" comparison member (see lib/crew-lift-compare.ts) — a real crew never
 * has this as an actual member; it only matters if something (e.g. a Developer Mode demo tool)
 * explicitly adds a member with this id. */
export const LEE_PRIEST_MEMBER_ID = "m6";
/** Id for a curated "glutes only" meme comparison member (see lib/crew-lift-compare.ts) — same as
 * Lee Priest above, never a real crew's actual member. */
export const BRO_MEMBER_ID = "m7";
/** A second, more extreme "glutes only" meme comparison member — unlike Bro (whose quads/back
 * inevitably ride along partway since they share lifts with glutes), her muscle rank is a hard
 * override: glutes maxed, literally every other muscle group Rookie. Same as above, never a real
 * crew's actual member. */
export const GLUTE_ONLY_MEMBER_ID = "m8";

export type DivisionHistoryEntry = { division: Division; reachedAt: number };
export type DivisionCelebration = { from: Division; to: Division };

type CrewSyncedState = {
  /** Real backend crew id — see backend/routes/crews.php. Empty string when not in a crew. */
  id: string;
  inviteCode: string;
  name: string;
  tagline: string;
  icon: string;
  createdAt: number;
  division: Division;
  /** Every division reached so far, oldest first, with when the crew first got there — powers the
   * Stats tab's division timeline. The final entry is the crew's current division. */
  divisionHistory: DivisionHistoryEntry[];
  /** e.g. 25 → "top 25% of crews in your division". Not computed by the backend yet (there's no
   * cross-crew leaderboard query) — stays at its local default until that exists. */
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

type CrewState = CrewSyncedState & {
  /** Set the moment `addXp` pushes the crew into a new division; the UI shows a celebration overlay
   * and clears it via `clearDivisionCelebration`. Deliberately not synced — a one-shot UI flag, not
   * real data. */
  pendingDivisionCelebration: DivisionCelebration | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

type CrewActions = {
  /** Server-backed: only removes the member from the shared crew row if you're leader/co-leader. */
  removeMember: (id: string) => void;
  setMemberRole: (id: string, role: CrewRole) => void;
  toggleMemberAdmin: (id: string) => void;
  /** Adds crew XP (e.g. a completed challenge reward), rolling over into the next division if it fills the bar. */
  addXp: (amount: number) => void;
  clearDivisionCelebration: () => void;
  /** Server-backed (leader/co-leader only) — awaits the server so a rejected change (e.g. a crew
   * name someone else already has) never shows as saved locally when it wasn't. */
  updateInfo: (updates: { name?: string; tagline?: string }) => Promise<ActionResult>;
  setIcon: (icon: string) => void;
  setPrivacy: (privacy: CrewPrivacy) => void;
  toggleJoinRequests: () => void;
  setTrainingType: (trainingType: string) => void;
  setMaxMembers: (maxMembers: number) => void;
  toggleNotification: (key: keyof CrewNotificationPrefs) => void;
  /** Removes the current user from the shared crew row (server-backed) — their challenge progress
   * (a separate store) is untouched. */
  leaveCrew: () => Promise<void>;
  /** Creates a brand new, genuinely shared crew with just you as leader. Fails if you're already in one. */
  createCrew: (input: { name: string; tagline?: string; icon?: string; trainingType?: string; privacy?: CrewPrivacy; maxMembers?: number }) => Promise<ActionResult>;
  /** Joins an existing real crew via its invite code. Fails if the code's invalid, the crew's full, or you're already in one. */
  joinCrewByCode: (inviteCode: string) => Promise<ActionResult>;
  /** Pulls this account's real, genuinely shared crew from the backend (backend/routes/crews.php) —
   * `null` means you're not in a crew, which resets local state to DEFAULT_CREW. */
  syncFromServer: () => Promise<void>;
};

// A real account with no crew yet — see (tabs)/crew.tsx and CrewCard for the "no crew yet, go
// create/join one" empty state this renders as. `createCrew`/`joinCrewByCode` replace this with
// the user's actual crew; nothing here is demo data.
const DEFAULT_CREW: CrewState = {
  id: "",
  inviteCode: "",
  name: "",
  tagline: "",
  icon: "gorilla",
  createdAt: Date.now(),
  division: "Rookie",
  divisionHistory: [{ division: "Rookie", reachedAt: Date.now() }],
  pendingDivisionCelebration: null,
  divisionTopPercentile: 0,
  globalRank: 0,
  region: "",
  xp: 0,
  crewPower: 0,
  crewPowerChangePercent: 0,
  maxMembers: 8,
  members: [],
  todayPlan: {
    workoutName: "Rest Day",
    memberIdsTraining: [],
  },
  privacy: "invite-only",
  joinRequestsEnabled: true,
  trainingType: "",
  subscriptionActive: false,
  notifications: {
    workoutReminders: true,
    prAlerts: true,
    challengeUpdates: true,
  },
};

function myClerkUserId(): string | null {
  return getClerkInstance().user?.id ?? null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/** Maps the backend's shared-crew shape onto this store's local shape — remapping your own real
 * member id to CURRENT_MEMBER_ID (see its doc comment above) so every existing screen that reads
 * crew members keeps working unchanged. */
function normalizeCrew(apiCrew: ApiCrew): Pick<CrewSyncedState, "id" | "inviteCode" | "name" | "tagline" | "icon" | "trainingType" | "privacy" | "joinRequestsEnabled" | "maxMembers" | "xp" | "division" | "divisionHistory" | "createdAt" | "members"> {
  const myId = myClerkUserId();
  return {
    id: apiCrew.id,
    inviteCode: apiCrew.inviteCode,
    name: apiCrew.name,
    tagline: apiCrew.tagline,
    icon: apiCrew.icon,
    trainingType: apiCrew.trainingType,
    privacy: apiCrew.privacy,
    joinRequestsEnabled: apiCrew.joinRequestsEnabled,
    maxMembers: apiCrew.maxMembers,
    xp: apiCrew.xp,
    division: apiCrew.division as Division,
    divisionHistory: apiCrew.divisionHistory as DivisionHistoryEntry[],
    createdAt: apiCrew.createdAt,
    members: apiCrew.members.map((member) => ({
      id: member.id === myId ? CURRENT_MEMBER_ID : member.id,
      name: member.name,
      username: member.username,
      avatarUrl: member.avatarUrl,
      level: member.level,
      division: member.division as Division,
      role: member.role,
      isAdmin: member.isAdmin,
      isOnline: true,
    })),
  };
}

export const useCrewStore = create<CrewState & CrewActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CREW,
      removeMember: (id) => {
        const crewId = get().id;
        set((state) => ({ members: state.members.filter((member) => member.id !== id) }));
        if (crewId) api.kickCrewMember(crewId, id).catch((error) => console.warn("Failed to remove crew member on server", error));
      },
      // Not yet server-backed — role management within a shared crew needs its own endpoint
      // (leader/co-leader promotion), which hasn't been built yet. Local-only for now.
      setMemberRole: (id, role) => {
        set((state) => ({ members: state.members.map((member) => (member.id === id ? { ...member, role } : member)) }));
      },
      toggleMemberAdmin: (id) => {
        set((state) => ({
          members: state.members.map((member) => (member.id === id ? { ...member, isAdmin: !member.isAdmin } : member)),
        }));
      },
      // Not yet server-backed — crew XP/division comes from the challenge/battle system, which
      // still only tracks per-account progress (see db/schema.sql's user_state comment). Local-only for now.
      addXp: (amount) => {
        set((state) => {
          const result = advanceDivision(state.xp, state.division, amount);
          if (!result.leveledUp) return { xp: result.xp };

          return {
            xp: result.xp,
            division: result.division,
            divisionHistory: [...state.divisionHistory, { division: result.to, reachedAt: Date.now() }],
            pendingDivisionCelebration: { from: result.from, to: result.to },
          };
        });
      },
      clearDivisionCelebration: () => set({ pendingDivisionCelebration: null }),
      updateInfo: async (updates) => {
        const crewId = get().id;
        if (!crewId) return { ok: false, error: "Not in a crew." };
        try {
          const crew = await api.updateCrew(crewId, updates);
          set({ name: crew.name, tagline: crew.tagline });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },
      setIcon: (icon) => {
        const crewId = get().id;
        set({ icon });
        if (crewId) api.updateCrew(crewId, { icon }).catch((error) => console.warn("Failed to sync crew icon to server", error));
      },
      setPrivacy: (privacy) => {
        const crewId = get().id;
        set({ privacy });
        if (crewId) api.updateCrew(crewId, { privacy }).catch((error) => console.warn("Failed to sync crew privacy to server", error));
      },
      toggleJoinRequests: () => {
        const crewId = get().id;
        const joinRequestsEnabled = !get().joinRequestsEnabled;
        set({ joinRequestsEnabled });
        if (crewId) {
          api.updateCrew(crewId, { joinRequestsEnabled }).catch((error) => console.warn("Failed to sync join requests setting to server", error));
        }
      },
      setTrainingType: (trainingType) => {
        const crewId = get().id;
        set({ trainingType });
        if (crewId) api.updateCrew(crewId, { trainingType }).catch((error) => console.warn("Failed to sync training type to server", error));
      },
      setMaxMembers: (maxMembers) => {
        const crewId = get().id;
        set({ maxMembers });
        if (crewId) api.updateCrew(crewId, { maxMembers }).catch((error) => console.warn("Failed to sync max members to server", error));
      },
      // Local preference only — not part of the shared crew row (every member could want different
      // notification settings for the same crew).
      toggleNotification: (key) => {
        set((state) => ({ notifications: { ...state.notifications, [key]: !state.notifications[key] } }));
      },
      leaveCrew: async () => {
        const crewId = get().id;
        if (!crewId) return;
        try {
          if (isApiConfigured) await api.leaveCrewApi(crewId);
          set(DEFAULT_CREW);
        } catch (error) {
          console.warn("Failed to leave crew on server", error);
        }
      },
      createCrew: async (input) => {
        if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
        try {
          const crew = await api.createCrew(input);
          set(normalizeCrew(crew));
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },
      joinCrewByCode: async (inviteCode) => {
        if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
        try {
          const crew = await api.joinCrewByCode(inviteCode);
          set(normalizeCrew(crew));
          return { ok: true };
        } catch (error) {
          return { ok: false, error: errorMessage(error) };
        }
      },
      syncFromServer: async () => {
        if (!isApiConfigured) return;
        try {
          const crew = await api.getMyCrew();
          if (crew) set(normalizeCrew(crew));
          else set(DEFAULT_CREW);
        } catch (error) {
          console.warn("Failed to sync crew from server, keeping local data", error);
        }
      },
    }),
    {
      name: "gymcrew-crew",
      storage: createJSONStorage(() => AsyncStorage),
      // Bumped once to hard-discard any locally cached "Iron Squad" demo crew from before this
      // store stopped shipping fake members by default, and again for the move to a real, shared
      // backend crew (old cached state has no `id`/`inviteCode`). `syncFromServer` (called on every
      // sign-in) re-populates this correctly from the database right after.
      version: 2,
      migrate: () => DEFAULT_CREW,
    },
  ),
);
