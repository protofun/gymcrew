import { create } from "zustand";

import { api, isApiConfigured } from "@/lib/api";

type ActionResult = { ok: true } | { ok: false; error: string };

type UserSocialsState = {
  /** `undefined` = not checked yet this session, `null` = checked and never submitted, an object =
   * already submitted. SocialsPromptOverlay only ever shows once this is confirmed `null` — never
   * while it's still `undefined`, so a slow/failed check never flashes the overlay for someone who
   * already submitted. */
  status: ApiUserSocialsOrNull | undefined;
  submitting: boolean;
};

type ApiUserSocialsOrNull = { instagramHandle: string; tiktokHandle: string } | null;

type UserSocialsActions = {
  checkStatus: () => Promise<void>;
  submit: (instagramHandle: string, tiktokHandle: string) => Promise<ActionResult>;
};

export const useUserSocialsStore = create<UserSocialsState & UserSocialsActions>()((set) => ({
  status: undefined,
  submitting: false,

  checkStatus: async () => {
    if (!isApiConfigured) return;
    try {
      const status = await api.getMySocials();
      set({ status });
    } catch (error) {
      console.warn("Failed to check submitted socials", error);
    }
  },

  submit: async (instagramHandle, tiktokHandle) => {
    if (!isApiConfigured) return { ok: false, error: "Not connected to the server." };
    set({ submitting: true });
    try {
      await api.submitSocials(instagramHandle, tiktokHandle);
      set({ status: { instagramHandle, tiktokHandle }, submitting: false });
      return { ok: true };
    } catch (error) {
      set({ submitting: false });
      return { ok: false, error: error instanceof Error ? error.message : "Could not submit right now. Try again." };
    }
  },
}));
