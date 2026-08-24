import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type NotificationsState = {
  /** Notification ids already seen — the unread dot only lights up for ids not in here yet. */
  readIds: string[];
};

type NotificationsActions = {
  markAllRead: (ids: string[]) => void;
};

export const useNotificationsStore = create<NotificationsState & NotificationsActions>()(
  persist(
    (set, get) => ({
      readIds: [],
      markAllRead: (ids) => {
        const state = get();
        const merged = new Set([...state.readIds, ...ids]);
        set({ readIds: [...merged] });
      },
    }),
    {
      name: "gymcrew-notifications-read",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
