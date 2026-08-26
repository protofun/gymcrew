import { api, isApiConfigured } from "@/lib/api";

/**
 * Fire-and-forget push of a store's data to the backend under `key` (see backend/routes/state.php)
 * — call after every local mutation on a backend-synced store. Errors are logged, never thrown, so
 * a slow/unreachable backend never blocks the UI (same as the bespoke stores — workout-history,
 * personal-records, body-log). A no-op until a backend is actually configured.
 */
export function pushState(key: string, data: unknown): void {
  if (!isApiConfigured) return;
  api.setState(key, data).catch((error) => console.warn(`Failed to sync ${key} to server`, error));
}

/**
 * Pulls the backend's version of `key` and, if one exists, replaces local state with it via
 * `applyState` — "backend wins once reachable" as with the other synced stores, so a genuinely
 * empty backend response for a brand-new account correctly clears out local/demo data rather than
 * leaving it in place. Call once per sign-in (see app/(tabs)/_layout.tsx). A no-op without a
 * configured/reachable backend — local state is left untouched.
 */
export async function pullState<T>(key: string, applyState: (data: T) => void): Promise<void> {
  if (!isApiConfigured) return;
  try {
    const data = await api.getState<T>(key);
    if (data !== null) applyState(data);
  } catch (error) {
    console.warn(`Failed to sync ${key} from server, keeping local data`, error);
  }
}
