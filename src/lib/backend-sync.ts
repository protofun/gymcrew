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
 * Collects every key `pullState` is asked for in the same tick into one shared request (see
 * `api.getStates`), instead of each caller firing its own HTTPS round trip. Sign-in syncs ~15
 * stores at once (see app/(tabs)/_layout.tsx's `Promise.all`) — that used to mean ~15 separate
 * requests, each paying its own network + PHP bootstrap cost, which is what made Home/Crew take
 * ~30s to show real data. `await Promise.resolve()` just yields one microtask so every `pullState`
 * call already queued this tick (the whole `Promise.all` array is built synchronously) gets to add
 * its key before the batch actually fires.
 */
let pendingKeys: Set<string> = new Set();
let pendingBatch: Promise<Record<string, unknown>> | null = null;

function batchedFetch(key: string): Promise<Record<string, unknown>> {
  pendingKeys.add(key);
  if (!pendingBatch) {
    pendingBatch = (async () => {
      await Promise.resolve();
      const keys = Array.from(pendingKeys);
      pendingKeys = new Set();
      pendingBatch = null;
      return api.getStates(keys);
    })();
  }
  return pendingBatch;
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
    const results = await batchedFetch(key);
    const data = results[key];
    if (data !== undefined && data !== null) applyState(data as T);
  } catch (error) {
    console.warn(`Failed to sync ${key} from server, keeping local data`, error);
  }
}
