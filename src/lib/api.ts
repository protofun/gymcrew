import { getClerkInstance } from "@clerk/expo";

import type { ChallengeMetric } from "@/data/challenges";
import type { Food } from "@/data/nutrition-foods";
import type { MealSlot } from "@/lib/meal-slot";
import type { LoggedExercise } from "@/store/active-workout-store";
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
    const raw = await response.text().catch(() => response.statusText);
    throw new Error(errorMessageFromResponseBody(raw, response.status));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Every backend error body is `{"error": "..."}` (see backend/response.php's errorResponse) — pull
 * that message out so callers/UI show the actual "That username is already taken." text instead of
 * the raw `{"error":"..."}` JSON. Falls back to the raw body if it's ever not JSON (e.g. a host-level
 * 502 HTML page). */
function errorMessageFromResponseBody(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    // not JSON — fall through to the raw text below
  }
  return raw || `Request failed (${status})`;
}

/** Same as `request`, but never attaches/requires a Clerk session — for the handful of routes that
 * are deliberately public (see backend/index.php's auth gate and its one exemption). */
async function requestPublic<T>(path: string): Promise<T> {
  if (!isApiConfigured) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");

  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const raw = await response.text().catch(() => response.statusText);
    throw new Error(errorMessageFromResponseBody(raw, response.status));
  }
  return (await response.json()) as T;
}

export type ApiProfile = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
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

export type ProgressPhotoPose = "front" | "side" | "back";
export type ProgressPhoto = { id: string; pose: ProgressPhotoPose; photoUrl: string; capturedAt: number };

export type ApiProfileLevel = {
  xp: number;
  division: string;
  divisionHistory: ApiDivisionHistoryEntry[];
};

export type ApiCrewMember = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
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
  /** When true (the default), this crew is auto-entered into a new Crew War the moment it has
   * none — see backend/routes/crew-wars.php's getOrStartWar. Off means the crew only ever enters
   * one when a leader/co-leader explicitly starts it (`api.startWar`). */
  warAutoMatchEnabled: boolean;
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
  Pick<ApiCrew, "name" | "tagline" | "icon" | "trainingType" | "privacy" | "joinRequestsEnabled" | "maxMembers" | "warAutoMatchEnabled">
>;

export type ApiDiscoverableCrew = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  trainingType: string;
  memberCount: number;
  maxMembers: number;
};

/** One real crew in the "Crews" leaderboard scope — see backend/routes/crews.php's
 * respondWithCrewLeaderboard (replaces the old static `OTHER_CREWS_POWER` mock). */
export type ApiCrewLeaderboardEntry = { id: string; name: string; icon: string; xp: number };

/** One real player in the "Global"/"Gym" leaderboard scopes — see
 * backend/routes/leaderboards.php (replaces the old static `PLAYER_LEADERBOARD` mock). */
export type ApiPlayerLeaderboardEntry = { id: string; name: string; avatarUrl: string; power: number; gymName: string | null; isMe: boolean };

/** Real "where do you stand at your own gym" for one lift — `null` means not enough real data yet
 * (no gym set, or fewer than 2 real peers) — see backend/routes/rank-standings.php. */
export type RankStanding = { gymRank: number; gymPoolSize: number };

export type ApiSupportTicket = { id: number; message: string; status: "open" | "resolved"; createdAt: number };

export type ApiUserSocials = { instagramHandle: string; tiktokHandle: string };

export type ApiAdminMessage = { id: number; message: string; sentAt: number };
export type ApiSupportReply = { id: number; senderType: "admin" | "user"; body: string; createdAt: number };

export type ApiRoadmapItem = { id: number; title: string; description: string | null; status: "planned" | "in_progress" | "shipped"; updatedAt: number };

export type ApiCrewMemberActivity = {
  recentWorkouts: CompletedWorkout[];
  records: Record<string, PersonalRecord>;
  profile: { gender: "male" | "female" | null; weightKg: number | null };
};

export type ApiWarContributor = { userId: string; name: string; volumeKg: number };

/** One logged workout during an active War, real or bot — see backend/routes/crew-wars.php's
 * crew_war_attacks. This is the attack feed CrewWarTab renders, not just a running total. */
export type ApiWarAttack = {
  attackerName: string;
  workoutName: string | null;
  volumeKg: number;
  prCount: number;
  score: number;
  attackedAt: number;
  isMine: boolean;
};

export type ApiCrewWar = {
  id: string;
  status: "active" | "completed";
  startedAt: number;
  endsAt: number;
  myScore: number;
  opponentScore: number;
  /** Only meaningful once `status` is "completed" — `null` means the War ended in a draw. */
  won: boolean | null;
  opponent: { id: string; name: string; icon: string; division: string };
  topContributors: ApiWarContributor[];
  recentAttacks: ApiWarAttack[];
};

/** `war` is `null` when the crew has no active War and its `warAutoMatchEnabled` setting is off —
 * see backend/routes/crew-wars.php's getOrStartWar. A leader/co-leader starts one with `startWar`. */
export type ApiActiveWarResponse = { war: ApiCrewWar | null };

/** A crew's real, currently-in-progress workout (see backend/routes/crew-live-sessions.php) — the
 * leader's own `active-workout-store` exercises, pushed here as they log, not chosen up front. */
export type ApiCrewLiveSession = {
  id: string;
  leaderId: string;
  leaderName: string;
  workoutName: string;
  exercises: LoggedExercise[];
  participantIds: string[];
  startedAt: number;
  updatedAt: number;
};

export type CrewActivityEventType = "pr" | "streak" | "long_session" | "division_up";

/** Fixed, deliberately small tap-react set — mirrors backend/routes/crew-activity-events.php's
 * CREW_ACTIVITY_REACTION_EMOJIS. Keep both in sync. */
export const CREW_ACTIVITY_REACTION_EMOJIS = ["🔥", "👏"] as const;
export type CrewActivityReactionEmoji = (typeof CREW_ACTIVITY_REACTION_EMOJIS)[number];
export type CrewActivityReactions = Record<CrewActivityReactionEmoji, { count: number; reacted: boolean }>;

export type ApiCrewActivityEvent = {
  id: number;
  userId: string;
  userName: string;
  eventType: CrewActivityEventType;
  payload: Record<string, unknown>;
  createdAt: number;
  reactions: CrewActivityReactions;
};

export type ApiCrewDuel = {
  id: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  metric: "volume" | "sets";
  targetDateKey: string;
  status: "pending" | "accepted" | "declined" | "completed";
  winnerId: string | null;
  createdAt: number;
};

/** App-wide, admin-curated challenges (see backend/routes/admin-challenges.php) — same shape as a
 * weekly ChallengeTemplate (data/challenges.ts), just hand-authored and persisted server-side
 * instead of procedurally picked. Write access is gated server-side to one admin account. */
export type ApiAdminChallenge = {
  id: string;
  name: string;
  description: string;
  metric: ChallengeMetric;
  unit: string;
  perMemberTarget: number;
  icon: string;
  isActive: boolean;
  /** Part of the GymCrew Summer Challenge event (see ChallengesTab) — shown in its own section,
   * locked/read-only until the app's real release instead of counting progress. */
  isSummerChallenge: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AdminChallengeInput = {
  name: string;
  description?: string;
  metric: ChallengeMetric;
  unit: string;
  perMemberTarget: number;
  icon?: string;
  isActive?: boolean;
  isSummerChallenge?: boolean;
};

/** A meal/shake ingredient — a `Food` snapshot (see data/nutrition-foods.ts) plus how much of it,
 * so `scaleMacros(item, item.quantity)` (lib/nutrition-macros.ts) always gives that item's current
 * contribution without needing the source food to still exist. */
export type MealItem = Food & { quantity: number };

export type MealKind = "meal" | "shake";

export type ApiMeal = {
  id: string;
  kind: MealKind;
  name: string;
  description: string;
  items: MealItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  createdAt: number;
  updatedAt: number;
};

export type SaveMealInput = Omit<ApiMeal, "id" | "createdAt" | "updatedAt"> & { id?: string };

export type ApiFoodLog = {
  id: string;
  foodId: string | null;
  mealId: string | null;
  name: string;
  mealSlot: MealSlot;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  dateKey: string;
  loggedAt: number;
};

export type CreateFoodLogInput = Omit<ApiFoodLog, "loggedAt"> & { loggedAt?: number };

export type ApiWaterLog = { id: string; amountMl: number; dateKey: string; loggedAt: number };

export type OffBarcodeLookupResponse = { found: false } | { found: true; food: Food };

/** `hasMore` reflects Open Food Facts' own result count for the term, not just "did this page come
 * back full" — see backend/routes/nutrition-off.php's handleOffSearch. Lets the client offer a real
 * "load more" instead of guessing when a term's matches run out. */
export type OffSearchResponse = { results: Food[]; hasMore: boolean; page: number };

export const api = {
  getProfile: () => request<ApiProfile>("/profile"),
  /** The admin panel's active "Page Management" banner, if any — see backend/routes/announcement.php. */
  getAnnouncement: () => request<{ message: string } | null>("/announcement"),
  /** The public roadmap (planned / in progress / shipped) — see backend/routes/roadmap.php and
   * the admin panel's Roadmap page. */
  getRoadmap: () => request<ApiRoadmapItem[]>("/roadmap"),
  updateProfile: (data: Partial<Omit<ApiProfile, "id">>) => request<ApiProfile>("/profile", { method: "PUT", body: data }),
  /** Public (no auth) — see backend/routes/profile.php's handleUsernameAvailability. Used during
   * onboarding, before an account (and therefore a session) exists yet. */
  checkUsernameAvailable: (username: string) =>
    requestPublic<{ available: boolean }>(`/username-available?username=${encodeURIComponent(username)}`),

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

  /** This user's own progress photos, newest first — optionally filtered to one pose. See
   * backend/routes/progress-photos.php. */
  getProgressPhotos: (pose?: ProgressPhotoPose) =>
    request<ProgressPhoto[]>(pose ? `/progress-photos?pose=${pose}` : "/progress-photos"),
  /** Uploads a captured progress photo — same base64-upload pattern as `uploadCrewIcon`/`uploadFoodPhoto`. */
  uploadProgressPhoto: (input: { pose: ProgressPhotoPose; imageBase64: string; contentType: string; capturedAt: number }) =>
    request<ProgressPhoto>("/progress-photos", { method: "POST", body: input }),
  deleteProgressPhoto: (id: string) => request<{ ok: true }>(`/progress-photos/${id}`, { method: "DELETE" }),

  /** Generic per-user JSON blob (see backend/routes/state.php) — backs the smaller personal stores
   * (goals, currency, cosmetics, ...) that don't need their own bespoke table. `getState` resolves
   * to `null` when nothing's been saved under that key yet. */
  getState: <T>(key: string) => request<T | null>(`/state/${key}`),
  setState: (key: string, data: unknown) => request<{ ok: true }>(`/state/${key}`, { method: "PUT", body: data }),
  /** Same as `getState`, but for every key at once — see backend/routes/state.php's
   * handleStateBatch. Used by `pullState` to collapse the ~15 separate sign-in syncs into one
   * request instead of one per store. */
  getStates: (keys: string[]) => request<Record<string, unknown>>(`/state-batch?keys=${keys.map(encodeURIComponent).join(",")}`),

  getProfileLevel: () => request<ApiProfileLevel | null>("/profile-level"),
  updateProfileLevel: (data: ApiProfileLevel) => request<{ ok: true }>("/profile-level", { method: "PUT", body: data }),

  /** Real, genuinely shared crews (see backend/routes/crews.php) — unlike `getState`/`setState`
   * above, these operate on ONE row every real member sees and edits together. */
  getMyCrew: () => request<ApiCrew | null>("/crews/mine"),
  createCrew: (data: CreateCrewInput) => request<ApiCrew>("/crews", { method: "POST", body: data }),
  joinCrewByCode: (inviteCode: string) => request<ApiCrew>("/crews/join", { method: "POST", body: { inviteCode } }),
  /** Crews set to "Public" — see backend/routes/crews.php's respondWithDiscoverableCrews. */
  discoverCrews: () => request<ApiDiscoverableCrew[]>("/crews/discover"),
  joinPublicCrew: (crewId: string) => request<ApiCrew>(`/crews/${crewId}/join-public`, { method: "POST" }),
  updateCrew: (crewId: string, data: UpdateCrewInput) => request<ApiCrew>(`/crews/${crewId}`, { method: "PUT", body: data }),
  /** Uploads a real photo as the crew's icon (leader/co-leader only) — see
   * backend/routes/crews.php's uploadCrewIcon. Saved server-side and returned as a public URL,
   * which is then just another value for the `icon` field, same as a preset key or DiceBear URL. */
  uploadCrewIcon: (crewId: string, imageBase64: string, contentType: string) =>
    request<{ icon: string }>(`/crews/${crewId}/icon`, { method: "POST", body: { imageBase64, contentType } }),
  leaveCrewApi: (crewId: string) => request<{ ok: true }>(`/crews/${crewId}/leave`, { method: "POST" }),
  kickCrewMember: (crewId: string, memberId: string) =>
    request<{ ok: true }>(`/crews/${crewId}/members/${memberId}`, { method: "DELETE" }),
  /** Every crewmate's real recent workouts/PRs/profile — see backend/routes/crews.php. */
  getCrewActivity: (crewId: string) => request<{ members: Record<string, ApiCrewMemberActivity> }>(`/crews/${crewId}/activity`),
  /** Reports a completed challenge/battle's XP reward — see backend/routes/crews.php's
   * awardCrewXp. `awardKey` must be a stable id for that specific completion (every crew member's
   * device calls this independently; the server applies the first report and no-ops the rest). */
  awardCrewXp: (crewId: string, amount: number, awardKey: string) =>
    request<ApiCrew>(`/crews/${crewId}/xp`, { method: "POST", body: { amount, awardKey } }),
  /** Real crews (including the permanent bot rivals) in the caller's own crew's division — see
   * backend/routes/crews.php's respondWithCrewLeaderboard. */
  getCrewLeaderboard: () => request<{ crews: ApiCrewLeaderboardEntry[]; myDivision: string | null }>("/crews/leaderboard"),
  /** Real players in the caller's own division — see backend/routes/leaderboards.php. */
  getPlayerLeaderboard: (scope: "global" | "gym") =>
    request<{ players: ApiPlayerLeaderboardEntry[]; myDivision: string | null }>(`/leaderboards/players?scope=${scope}`),
  /** Real per-lift "my gym" standing — see backend/routes/rank-standings.php. `null` per exerciseId
   * means not enough real data yet. */
  getRankStandings: (exerciseIds: string[]) =>
    exerciseIds.length === 0
      ? Promise.resolve<Record<string, RankStanding | null>>({})
      : request<Record<string, RankStanding | null>>(`/rank-standings?exerciseIds=${exerciseIds.map(encodeURIComponent).join(",")}`),

  /** Real crew-vs-crew Wars (see backend/routes/crew-wars.php). `war` is `null` when the crew has
   * none right now and its `warAutoMatchEnabled` setting is off — otherwise one auto-starts server
   * side (real matchmaking against an active real crew if one's waiting, else an immediate
   * same-division bot crew — a real row either way, not computed client-side). */
  getActiveWar: () => request<ApiActiveWarResponse>("/crew-wars/active"),
  /** Leader/co-leader only: start (or match into) a War right now, regardless of the crew's
   * `warAutoMatchEnabled` setting — see backend/routes/crew-wars.php's handleStartWar. */
  startWar: () => request<{ war: ApiCrewWar }>("/crew-wars/start", { method: "POST" }),
  /** One logged workout = one attack. Called right after a workout finishes. */
  attackInWar: (volumeKg: number, prCount: number, workoutName: string) =>
    request<{ ok: true; attacked: boolean; score?: number }>("/crew-wars/attack", {
      method: "POST",
      body: { volumeKg, prCount, workoutName },
    }),
  /** This crew's most recently finished War (for the shareable end-of-War recap) — independent of
   * `getActiveWar`, which replaces a just-ended War with a fresh one in the same call whenever
   * auto-match is on, so a completed War is otherwise never actually visible to the client. `null`
   * if this crew has never finished one. */
  getLastCompletedWar: () => request<ApiActiveWarResponse>("/crew-wars/last-completed"),

  /** Real, crew-shared "someone's currently training" state (see backend/routes/crew-live-sessions.php)
   * — replaces the old hardcoded `led-workout` mock. No pre-planning: `startLiveSession` is called the
   * moment the leader starts their own workout, and `updateLiveSessionExercises` mirrors it as they log. */
  getActiveLiveSession: () => request<{ session: ApiCrewLiveSession | null }>("/crew-live-sessions/active"),
  startLiveSession: (workoutName: string, exercises: LoggedExercise[]) =>
    request<{ session: ApiCrewLiveSession }>("/crew-live-sessions", { method: "POST", body: { workoutName, exercises } }),
  updateLiveSessionExercises: (exercises: LoggedExercise[]) =>
    request<{ ok: true }>("/crew-live-sessions/exercises", { method: "PUT", body: { exercises } }),
  joinLiveSession: () => request<{ session: ApiCrewLiveSession }>("/crew-live-sessions/join", { method: "POST" }),
  endLiveSession: () => request<{ ok: true }>("/crew-live-sessions/end", { method: "POST" }),

  /** The crew-internal motivation feed (see backend/routes/crew-activity-events.php) — real
   * timestamped crewmate moments (PRs, streaks, long sessions, division ups), not fabricated. */
  logCrewActivityEvent: (eventType: CrewActivityEventType, payload: Record<string, unknown>) =>
    request<{ ok: true; recorded: boolean }>("/crew-activity-events", { method: "POST", body: { eventType, payload } }),
  getCrewActivityEvents: (sinceMs?: number) =>
    request<ApiCrewActivityEvent[]>(sinceMs ? `/crew-activity-events?since=${sinceMs}` : "/crew-activity-events"),
  /** Toggle the caller's reaction to one feed event — a second tap with the same emoji removes it.
   * Returns that one event's full updated reaction summary (not just the emoji that changed), so the
   * caller can just overwrite its local copy rather than patch a single count. */
  reactToCrewActivityEvent: (eventId: number, emoji: CrewActivityReactionEmoji) =>
    request<{ eventId: number; reactions: CrewActivityReactions }>(`/crew-activity-events/${eventId}/react`, {
      method: "POST",
      body: { emoji },
    }),

  /** 1-on-1 "who does more today" crewmate challenges (see backend/routes/crew-duels.php). */
  getCrewDuels: () => request<ApiCrewDuel[]>("/crew-duels"),
  createDuel: (data: { opponentUserId: string; metric: "volume" | "sets"; targetDateKey: string }) =>
    request<ApiCrewDuel>("/crew-duels", { method: "POST", body: data }),
  respondToDuel: (duelId: string, accept: boolean) =>
    request<ApiCrewDuel>(`/crew-duels/${duelId}/respond`, { method: "POST", body: { accept } }),

  /** App-wide admin-curated challenges (see backend/routes/admin-challenges.php). GET returns every
   * challenge for the admin account, active-only for everyone else — create/update/delete 403 for
   * anyone but the admin, enforced server-side regardless of what the client shows. */
  getAdminChallenges: () => request<ApiAdminChallenge[]>("/admin-challenges"),
  createAdminChallenge: (data: AdminChallengeInput) => request<ApiAdminChallenge>("/admin-challenges", { method: "POST", body: data }),
  updateAdminChallenge: (id: string, data: Partial<AdminChallengeInput>) =>
    request<ApiAdminChallenge>(`/admin-challenges/${id}`, { method: "PUT", body: data }),
  deleteAdminChallenge: (id: string) => request<{ ok: true }>(`/admin-challenges/${id}`, { method: "DELETE" }),

  /** Saved meals & shakes (see backend/routes/nutrition-meals.php) — `kind` is the only thing that
   * tells them apart server-side. */
  getNutritionMeals: () => request<ApiMeal[]>("/nutrition-meals"),
  createNutritionMeal: (data: SaveMealInput) => request<ApiMeal>("/nutrition-meals", { method: "POST", body: data }),
  updateNutritionMeal: (id: string, data: SaveMealInput) => request<ApiMeal>(`/nutrition-meals/${id}`, { method: "PUT", body: data }),
  deleteNutritionMeal: (id: string) => request<{ ok: true }>(`/nutrition-meals/${id}`, { method: "DELETE" }),

  /** The daily food log (see backend/routes/nutrition-logs.php). */
  getFoodLogsByDate: (dateKey: string) => request<ApiFoodLog[]>(`/nutrition-logs?date=${encodeURIComponent(dateKey)}`),
  getFoodLogsByRange: (startKey: string, endKey: string) =>
    request<ApiFoodLog[]>(`/nutrition-logs?start=${encodeURIComponent(startKey)}&end=${encodeURIComponent(endKey)}`),
  addFoodLog: (data: CreateFoodLogInput) => request<ApiFoodLog>("/nutrition-logs", { method: "POST", body: data }),
  removeFoodLog: (id: string) => request<{ ok: true }>(`/nutrition-logs/${id}`, { method: "DELETE" }),
  /** Duplicates every entry from `fromDateKey` onto `toDateKey` server-side (see NUTRITION.md
   * section 32's "Copy Yesterday") — returns the newly created rows. */
  copyFoodLogDay: (fromDateKey: string, toDateKey: string) =>
    request<ApiFoodLog[]>("/nutrition-logs/copy-day", { method: "POST", body: { fromDateKey, toDateKey } }),

  /** Daily water intake (see backend/routes/nutrition-water.php) — same date-scoped flat-log shape
   * as food_logs. */
  getWaterLogsByDate: (dateKey: string) => request<ApiWaterLog[]>(`/nutrition-water?date=${encodeURIComponent(dateKey)}`),
  getWaterLogsByRange: (startKey: string, endKey: string) =>
    request<ApiWaterLog[]>(`/nutrition-water?start=${encodeURIComponent(startKey)}&end=${encodeURIComponent(endKey)}`),
  addWaterLog: (data: ApiWaterLog) => request<{ ok: true }>("/nutrition-water", { method: "POST", body: data }),
  removeWaterLog: (id: string) => request<{ ok: true }>(`/nutrition-water/${id}`, { method: "DELETE" }),

  /** Open Food Facts, proxied and cached server-side (see backend/routes/nutrition-off.php) — the
   * client never calls Open Food Facts directly. `found: false` is a normal, non-error outcome for
   * a barcode OFF doesn't have (see NUTRITION.md section 12). */
  lookupBarcode: (barcode: string) => request<OffBarcodeLookupResponse>(`/nutrition-off/barcode/${encodeURIComponent(barcode)}`),
  searchOpenFoodFacts: (query: string, page = 1) =>
    request<OffSearchResponse>(`/nutrition-off/search?q=${encodeURIComponent(query)}&page=${page}`),

  /** Uploads a photo for one of the user's own custom foods (see backend/routes/nutrition-food-photo.php)
   * — same base64-upload pattern as `uploadCrewIcon`. Returns a public URL the client stores directly
   * on that Food record's `photoUrl`. */
  uploadFoodPhoto: (imageBase64: string, contentType: string) =>
    request<{ url: string }>("/nutrition-food-photo", { method: "POST", body: { imageBase64, contentType } }),

  /** Flags a Crew or a specific member as objectionable (see backend/routes/reports.php) — reviewed
   * manually for now, no admin UI yet. */
  reportContent: (targetType: "crew" | "user", targetId: string, reason: string, details?: string) =>
    request<{ ok: true }>("/reports", { method: "POST", body: { targetType, targetId, reason, details } }),

  /** Registers this device's Expo push token so server-triggered pushes (crew PRs, division-ups)
   * can reach it — see lib/push-notifications.ts and backend/routes/push-token.php. */
  registerPushToken: (token: string) => request<{ ok: true }>("/push-token", { method: "PUT", body: { token } }),

  /** The caller's own submitted Instagram/TikTok handles (see backend/routes/user-socials.php) —
   * `null` if never submitted, which is what SocialsPromptOverlay checks to decide whether to show. */
  getMySocials: () => request<ApiUserSocials | null>("/user-socials/mine"),
  submitSocials: (instagramHandle: string, tiktokHandle: string) =>
    request<{ ok: true }>("/user-socials", { method: "POST", body: { instagramHandle, tiktokHandle } }),

  /** Admin-composed messages targeted at this account specifically (see
   * backend/routes/admin-messages.php) — shown as a blocking-until-dismissed overlay, oldest first. */
  getPendingAdminMessages: () => request<ApiAdminMessage[]>("/admin-messages/pending"),
  dismissAdminMessage: (id: number) => request<{ ok: true }>(`/admin-messages/${id}/dismiss`, { method: "POST" }),

  /** A user-submitted bug report / feedback message — becomes a two-way ticket, see
   * backend/routes/support.php. Admins reply from the admin panel; this is what starts one. */
  sendSupportMessage: (message: string, email?: string) =>
    request<{ ok: true; id: number }>("/support", { method: "POST", body: { message, email } }),
  /** This account's own support tickets, newest first. */
  getMySupportTickets: () => request<ApiSupportTicket[]>("/support"),
  getSupportTicketDetail: (id: number) => request<{ ticket: ApiSupportTicket; replies: ApiSupportReply[] }>(`/support/${id}`),
  replySupportTicket: (id: number, body: string) => request<{ ok: true }>(`/support/${id}/reply`, { method: "POST", body: { body } }),
};
