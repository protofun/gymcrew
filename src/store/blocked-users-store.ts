import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { pullState, pushState } from "@/lib/backend-sync";

type BlockedUsersData = { blockedUserIds: string[] };

type BlockedUsersStore = BlockedUsersData & {
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  syncFromServer: () => Promise<void>;
};

/** Per-account list of crewmates you've chosen to block — hides their content wherever crew
 * members are shown (see crew/members.tsx, crew/activity.tsx) as GymCrew's baseline "block an
 * abusive user" mechanism alongside reports (see components/ReportModal.tsx). Blocking is
 * one-directional and purely a display filter on your own device/account — it doesn't remove them
 * from the Crew itself (that's still a leader-only kick, see crew-store.ts's removeMember) and they
 * aren't notified. */
export const useBlockedUsersStore = create<BlockedUsersStore>()(
  persist(
    (set, get) => ({
      blockedUserIds: [],
      isBlocked: (userId) => get().blockedUserIds.includes(userId),
      blockUser: (userId) => {
        if (get().blockedUserIds.includes(userId)) return;
        const blockedUserIds = [...get().blockedUserIds, userId];
        set({ blockedUserIds });
        pushState("blocked-users", { blockedUserIds });
      },
      unblockUser: (userId) => {
        const blockedUserIds = get().blockedUserIds.filter((id) => id !== userId);
        set({ blockedUserIds });
        pushState("blocked-users", { blockedUserIds });
      },
      syncFromServer: () => pullState<BlockedUsersData>("blocked-users", (data) => set(data)),
    }),
    {
      name: "gymcrew-blocked-users",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
