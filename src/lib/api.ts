import { getClerkInstance } from "@clerk/expo";

import type { BodyLogEntry } from "@/store/body-log-store";
import type { PersonalRecord } from "@/store/personal-records-store";
import type { CompletedWorkout } from "@/store/workout-history-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/** True once a backend URL is actually configured — every store checks this before attempting to
 * sync, so the app works exactly as before (local/demo data only) until a backend is deployed. */
export const isApiConfigured = API_BASE_URL.length > 0;

async function getAuthToken(): Promise<string | null> {
  const clerk = getClerkInstance();
  return (await clerk.session?.getToken()) ?? null;
}

/**
 * Polls for a usable session token — call this right after `signUp.finalize()` / `signIn.finalize()`
 * / a successful SSO flow, before pushing any data or navigating away. Clerk's own "session is
 * active" state can take a beat to actually propagate client-side even after finalize() resolves;
 * without this wait, an immediate API call reads no token yet (silently fails, see `request`'s
 * "Not signed in" error — swallowed by every store's `.catch()`), and an immediate redirect can race
 * the same gap, landing back on a route that still thinks nobody's signed in. Resolves `true` once a
 * token is available, `false` if it never shows up within the timeout (caller proceeds regardless —
 * this only closes a timing gap, it doesn't block on a real failure).
 */
export async function waitForAuthToken(maxAttempts = 15, delayMs = 200): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await getAuthToken()) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!isApiConfigured) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");

  const token = await getAuthToken();
  if (!token) throw new Error("Not signed in");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API ${options.method ?? "GET"} ${path} failed (${response.status}): ${message}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type ApiProfile = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  gender?: "male" | "female" | null;
  heightCm?: number | null;
  weightKg?: number | null;
  age?: number | null;
  gymName?: string | null;
  goal?: string | null;
  experienceLevel?: string | null;
};

export type PrCheckResponse = {
  isNewRecord: boolean;
  previousBestKg: number | null;
  previousAchievedAt: number | null;
};

export type ApiDivisionHistoryEntry = { division: string; reachedAt: number };

export type ApiProfileLevel = {
  xp: number;
  division: string;
  divisionHistory: ApiDivisionHistoryEntry[];
};

export type ApiCrewMember = {
  id: string;
  name: string;
  username: string;
  level: number;
  division: string;
  role: "leader" | "co-leader" | "member";
  isAdmin: boolean;
};

export type ApiCrew = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  trainingType: string;
  privacy: "invite-only" | "open" | "public";
  joinRequestsEnabled: boolean;
  maxMembers: number;
  inviteCode: string;
  xp: number;
  division: string;
  divisionHistory: ApiDivisionHistoryEntry[];
  createdAt: number;
  members: ApiCrewMember[];
};

export type CreateCrewInput = {
  name: string;
  tagline?: string;
  icon?: string;
  trainingType?: string;
  privacy?: ApiCrew["privacy"];
  maxMembers?: number;
};

export type UpdateCrewInput = Partial<
  Pick<ApiCrew, "name" | "tagline" | "icon" | "trainingType" | "privacy" | "joinRequestsEnabled" | "maxMembers">
>;

export type ApiCrewMemberActivity = {
  recentWorkouts: CompletedWorkout[];
  records: Record<string, PersonalRecord>;
  profile: { gender: "male" | "female" | null; weightKg: number | null };
};

export const api = {
  getProfile: () => request<ApiProfile>("/profile"),
  updateProfile: (data: Partial<Omit<ApiProfile, "id">>) => request<ApiProfile>("/profile", { method: "PUT", body: data }),

  /** Deletes this user's row and, via ON DELETE CASCADE, every other table's rows for them (see
   * backend/routes/account.php). Call before deleting the Clerk account — this endpoint's auth
   * stops working the moment that's gone. */
  deleteAccount: () => request<{ ok: true }>("/account", { method: "DELETE" }),

  getWorkouts: () => request<CompletedWorkout[]>("/workouts"),
  createWorkout: (workout: CompletedWorkout) => request<{ ok: true }>("/workouts", { method: "POST", body: workout }),
  updateWorkoutNotes: (id: string, notes: string) => request<{ ok: true }>(`/workouts/${id}`, { method: "PUT", body: { notes } }),

  getRecords: () => request<Record<string, PersonalRecord>>("/records"),
  checkAndRecord: (input: { exerciseId: string; exerciseName: string; weightKg: number; reps: number }) =>
    request<PrCheckResponse>("/records", { method: "POST", body: input }),
  /** Every PR ever set for one exercise, oldest first — see backend/routes/records.php. Starts
   * empty for PRs set before this existed (only the current best survives those, in `getRecords`). */
  getRecordHistory: (exerciseId: string) =>
    request<{ weightKg: number; reps: number; achievedAt: number }[]>(`/records/history/${encodeURIComponent(exerciseId)}`),

  getBodyLog: () => request<BodyLogEntry[]>("/body-log"),
  addBodyLogEntry: (entry: { weightKg: number; bodyFatPercent: number | null }) =>
    request<BodyLogEntry>("/body-log", { method: "POST", body: entry }),
  removeBodyLogEntry: (id: string) => request<{ ok: true }>(`/body-log/${id}`, { method: "DELETE" }),

  /** Generic per-user JSON blob (see backend/routes/state.php) — backs the smaller personal stores
   * (goals, currency, cosmetics, ...) that don't need their own bespoke table. `getState` resolves
   * to `null` when nothing's been saved under that key yet. */
  getState: <T>(key: string) => request<T | null>(`/state/${key}`),
  setState: (key: string, data: unknown) => request<{ ok: true }>(`/state/${key}`, { method: "PUT", body: data }),

  getProfileLevel: () => request<ApiProfileLevel | null>("/profile-level"),
  updateProfileLevel: (data: ApiProfileLevel) => request<{ ok: true }>("/profile-level", { method: "PUT", body: data }),

  /** Real, genuinely shared crews (see backend/routes/crews.php) — unlike `getState`/`setState`
   * above, these operate on ONE row every real member sees and edits together. */
  getMyCrew: () => request<ApiCrew | null>("/crews/mine"),
  createCrew: (data: CreateCrewInput) => request<ApiCrew>("/crews", { method: "POST", body: data }),
  joinCrewByCode: (inviteCode: string) => request<ApiCrew>("/crews/join", { method: "POST", body: { inviteCode } }),
  updateCrew: (crewId: string, data: UpdateCrewInput) => request<ApiCrew>(`/crews/${crewId}`, { method: "PUT", body: data }),
  leaveCrewApi: (crewId: string) => request<{ ok: true }>(`/crews/${crewId}/leave`, { method: "POST" }),
  kickCrewMember: (crewId: string, memberId: string) =>
    request<{ ok: true }>(`/crews/${crewId}/members/${memberId}`, { method: "DELETE" }),
  /** Every crewmate's real recent workouts/PRs/profile — see backend/routes/crews.php. */
  getCrewActivity: (crewId: string) => request<{ members: Record<string, ApiCrewMemberActivity> }>(`/crews/${crewId}/activity`),
};
