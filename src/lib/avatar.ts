import { api, isApiConfigured } from "@/lib/api";

const DICEBEAR_STYLE = "avataaars";

type ClerkUserLike = {
  setProfileImage: (params: { file: Blob }) => Promise<unknown>;
  reload: () => Promise<unknown>;
  imageUrl: string;
};

/**
 * The one place a new profile photo actually gets applied — used by both "choose from library" and
 * "generate an avatar" so there's a single path from "here's a blob" to "Clerk hosts it, and the
 * backend knows about it too" (see backend/routes/crews.php's avatarUrl, which is how crewmates ever
 * see it). Clerk stays the source of truth for your OWN photo (`user.imageUrl`, shown on the profile
 * screen); the backend only stores a synced pointer to it, for other people's crew views to read.
 */
export async function applyProfileImage(user: ClerkUserLike, file: Blob): Promise<void> {
  await user.setProfileImage({ file });
  await user.reload();
  if (isApiConfigured) {
    await api.updateProfile({ avatarUrl: user.imageUrl }).catch((error) => console.warn("Failed to sync avatar to server", error));
  }
}

/** A DiceBear avatar for a given seed — same seed always renders the same image, so this doubles as
 * both "generate a fresh option" (random seed) and "this person's stable default" (their user id,
 * see backend/routes/crews.php's defaultAvatarUrl, which every crew member without a real photo
 * falls back to). Free, keyless API — safe to hotlink directly, no backend involvement needed. */
export function dicebearAvatarUrl(seed: string, size = 200): string {
  return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/png?seed=${encodeURIComponent(seed)}&size=${size}`;
}

/** A fresh batch of random seeds for the avatar generator grid — regenerate to "shuffle" a new set of options. */
export function randomAvatarSeeds(count: number): string[] {
  return Array.from({ length: count }, () => Math.random().toString(36).slice(2));
}
