import { getClerkInstance } from "@clerk/expo";

export function getClerkErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const { longMessage, message } = error as { longMessage?: unknown; message?: unknown };
    if (typeof longMessage === "string") return longMessage;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Marks a flag on the signed-in Clerk account's own metadata — independent of this app's own
 * backend (see backend/README.md), so "skip the wizard/crew-setup for a returning user" keeps
 * working even if that backend is unreachable or still being set up. Called from Zustand stores
 * (not components), so it goes through `getClerkInstance()` rather than the `useUser()` hook. A
 * no-op if nobody's signed in yet (e.g. mid-wizard, before account creation) — callers that need
 * this to actually stick call it again once a user exists. `updateMetadata` deep-merges, so setting
 * one flag never clobbers another already set here.
 */
async function markClerkAccountFlag(key: "hasCompletedOnboarding" | "hasCompletedCrewSelection"): Promise<void> {
  const user = getClerkInstance().user;
  if (!user) return;
  try {
    await user.updateMetadata({ unsafeMetadata: { [key]: true } });
  } catch (error) {
    console.warn(`Failed to persist ${key} to Clerk`, error);
  }
}

export function markClerkAccountOnboarded(): Promise<void> {
  return markClerkAccountFlag("hasCompletedOnboarding");
}

export function markClerkAccountCrewSelected(): Promise<void> {
  return markClerkAccountFlag("hasCompletedCrewSelection");
}
