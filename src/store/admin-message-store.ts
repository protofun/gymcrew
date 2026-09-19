import { create } from "zustand";

import { api, isApiConfigured, type ApiAdminMessage } from "@/lib/api";

type AdminMessageState = {
  /** Oldest-first queue of this account's undismissed admin messages — AdminMessageOverlay only
   * ever shows `pending[0]`, dismissing it before the next one (if any) appears. */
  pending: ApiAdminMessage[];
};

type AdminMessageActions = {
  checkPending: () => Promise<void>;
  dismiss: (id: number) => void;
};

export const useAdminMessageStore = create<AdminMessageState & AdminMessageActions>()((set, get) => ({
  pending: [],

  checkPending: async () => {
    if (!isApiConfigured) return;
    try {
      const pending = await api.getPendingAdminMessages();
      set({ pending });
    } catch (error) {
      console.warn("Failed to check pending admin messages", error);
    }
  },

  dismiss: (id) => {
    set({ pending: get().pending.filter((message) => message.id !== id) });
    if (!isApiConfigured) return;
    api.dismissAdminMessage(id).catch((error) => console.warn("Failed to dismiss admin message", error));
  },
}));
