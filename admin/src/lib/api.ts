const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const isApiConfigured = !!API_BASE_URL;

const TOKEN_KEY = "gymcrew-admin-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

/** Same shape as the mobile app's lib/api.ts request() helper — Bearer token from localStorage
 * (see getToken above) instead of a Clerk session. A 401 almost always means the admin session
 * expired (12h, see backend/admin-auth.php) — callers should send the user back to /signin. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError("VITE_API_BASE_URL is not configured", 0);
  }

  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/admin${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    // fetch() itself never got an HTTP response at all — almost always either the API is
    // unreachable (wrong VITE_API_BASE_URL, server down) or the browser blocked the response as a
    // CORS failure. The latter happens if a PHP fatal error kills the script before it reaches the
    // Access-Control-Allow-Origin header index.php normally sets unconditionally, very early (see
    // index.php) — so this message is the single most useful signal for exactly that case, without
    // needing to open the Network tab.
    throw new ApiError(
      `Could not reach the API (${err instanceof Error ? err.message : "network error"}). This usually means the API is unreachable, or a PHP fatal error on the server is preventing a valid response — check the backend's PHP error log.`,
      0,
    );
  }

  const rawText = await response.text();
  let data: unknown = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    const errorField = data && typeof data === "object" && "error" in data ? (data as { error?: string }).error : undefined;
    // Falling back to the raw response body (truncated) surfaces a PHP fatal error's real message
    // instead of a generic "Request failed" — exactly what's needed to diagnose a server-side bug
    // without needing devtools.
    throw new ApiError(errorField || rawText.slice(0, 300) || `Request failed (${response.status})`, response.status);
  }

  return data as T;
}

export type AdminUser = { id: string; email: string; totpEnabled?: boolean };

export type DashboardStats = {
  totalUsers: number;
  newUsers7d: number;
  bannedUsers: number;
  totalCrews: number;
  totalWorkouts: number;
  workouts7d: number;
  openReports: number;
  openSupport: number;
  signupsByDay: { date: string; count: number }[];
};

export type LiveNow = {
  usersOnline: number;
  activeSessions: number;
  newSessionsLast10Min: number;
  newUsersToday: number;
  sessionsToday: number;
  workoutsStartedToday: number;
  workoutsCompletedToday: number;
  prsToday: number;
  crewsCreatedToday: number;
  crewJoinsToday: number;
  mealsLoggedToday: number;
};

export type ActivityFeedEntry = {
  type: "user_registered" | "crew_created" | "crew_joined" | "workout_completed" | "pr_achieved" | "meal_logged";
  timestamp: number;
  userName: string;
  detail: string | null;
};

export type LaunchPeriod = "today" | "7d" | "30d" | "all";
export type LaunchPerformance = {
  period: LaunchPeriod;
  totalUsers: number;
  newUsersInPeriod: number;
  newUsersChangePercent: number | null;
  dau: number;
  wau: number;
  returningUsersInPeriod: number;
  avgSessionDurationSeconds: number;
  sessionsPerUser: number;
  usersOverTime: ChartPoint[];
  dailyActiveUsers: ChartPoint[];
  newUsersPerDay: ChartPoint[];
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionPercent: number;
  dropOffPercent: number;
};
export type ProductFunnel = {
  stages: FunnelStage[];
  biggestDropOff: { fromLabel: string; toLabel: string; dropOffPercent: number } | null;
};

export type TopExercise = { exerciseName: string; users: number; sets: number; volumeKg: number; prs: number };
export type WorkoutAnalytics = {
  totalWorkouts: number;
  workoutsToday: number;
  workoutsThisWeek: number;
  avgWorkoutsPerUser: number;
  avgDurationSeconds: number;
  exercisesLogged: number;
  setsLogged: number;
  repsLogged: number;
  totalVolumeKg: number;
  prsAchieved: number;
  topExercises: TopExercise[];
  topMuscleGroups: LabelCount[];
};

export type TopCrew = { id: string; name: string; members: number; workouts: number; prs: number; recentActivity: number };
export type CrewAnalytics = {
  totalCrews: number;
  newCrewsToday: number;
  avgCrewSize: number;
  largestCrewSize: number;
  mostActiveCrew: string | null;
  invitesSent: number;
  invitesAccepted: number;
  topCrews: TopCrew[];
};

export type MostImprovedUser = { userId: string; userName: string; previousDivision: string; currentDivision: string; improvement: number };
export type RankingAnalytics = {
  rankPageViews: number;
  rankCalculations: number;
  prsToday: number;
  totalPrs: number;
  divisionDistribution: LabelCount[];
  mostImproved: MostImprovedUser[];
};

export type RetentionDay = { day: number; retainedPercent: number | null; cohortSize: number };
export type Retention = { retention: RetentionDay[]; returningUsers: number };

export type PwaAdoption = {
  totalUsers: number;
  installed: number;
  notInstalled: number;
  installationRatePercent: number;
  iosInstalls: number;
  androidInstalls: number;
  mobileUsers: number;
  desktopUsers: number;
  pwaOpens: number;
};

export type Insight = { severity: "warning" | "info"; title: string; detail: string };
export type Insights = { insights: Insight[]; note: string | null };

export type ActivityHeatmap = { grid: number[][]; days: string[] };

export type EventLogEntry = {
  id: number;
  userId: string | null;
  userName: string | null;
  sessionId: string;
  eventType: string;
  screenName: string | null;
  properties: Record<string, unknown> | null;
  timestamp: number;
};

export type AdminUserListItem = {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  gymName: string | null;
  createdAt: string;
  banned: boolean;
  isFoundingAthlete: boolean;
  workoutCount: number;
  prCount: number;
  mealCount: number;
  sessionCount: number;
  lastActiveAt: number | null;
  devicePlatform: string | null;
  pwaInstalled: boolean;
  crewName: string | null;
  division: string | null;
};

export type UsersFilter = "active_today" | "new" | "no_workout" | "no_crew" | "no_return" | "pwa_installed" | "pwa_not_installed";

export type AdminUserDetail = AdminUserListItem & {
  avatarUrl: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  goal: string | null;
  experienceLevel: string | null;
  hasPushToken: boolean;
  workoutCount: number;
  crew: { id: string; name: string; role: string } | null;
};

export type AdminCrewListItem = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  privacy: "invite-only" | "open" | "public";
  division: string;
  xp: number;
  memberCount: number;
  createdAt: number;
  disabled: boolean;
};

export type AdminCrewDetail = AdminCrewListItem & {
  trainingType: string;
  maxMembers: number;
  inviteCode: string;
  members: { id: string; fullName: string | null; username: string | null; role: string }[];
};

export type AdminReport = {
  id: number;
  targetType: "crew" | "user";
  targetId: string;
  reason: string;
  details: string | null;
  status: "open" | "resolved";
  reporterName: string;
  createdAt: number;
};

export type AdminSupportMessage = {
  id: number;
  message: string;
  contactEmail: string | null;
  userName: string;
  status: "open" | "resolved";
  createdAt: number;
};

export type SupportReply = { id: number; senderType: "admin" | "user"; body: string; createdAt: number };

export type AdminSupportDetail = {
  ticket: {
    id: number;
    message: string;
    status: "open" | "resolved";
    userName: string;
    contactEmail: string | null;
    userId: string;
    createdAt: number;
  };
  replies: SupportReply[];
};

export type BannerKind = "info" | "deal" | "important" | "success";
export type BannerDisplay = "banner" | "popup";
export type BannerPlacement = "home" | "log" | "crew" | "ranks" | "profile";
export type BannerAudience = "all" | "new" | "no_crew" | "in_crew" | "founding" | "no_workout";
export type BannerStatus = "live" | "scheduled" | "expired" | "off";

/** What the banner form sends (and what the server stores) — everything an admin can set. */
export type BannerInput = {
  kind: BannerKind;
  display: BannerDisplay;
  placement: BannerPlacement;
  title: string | null;
  message: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  promoCode: string | null;
  audience: BannerAudience;
  /** Epoch milliseconds; null = no limit. */
  startsAt: number | null;
  endsAt: number | null;
  dismissible: boolean;
  priority: number;
  active: boolean;
};

export type AdminBanner = BannerInput & {
  id: number;
  status: BannerStatus;
  views: number;
  clicks: number;
  createdAt: number;
};

/** The personal data an admin may change on a user (any subset). An empty string clears a field. */
export type UserProfileUpdate = Partial<{
  email: string;
  fullName: string;
  username: string;
  gender: "male" | "female" | "";
  heightCm: number | "";
  weightKg: number | "";
  age: number | "";
  gymName: string;
  goal: string;
  experienceLevel: string;
}>;

export type AdminNote = { id: number; note: string; createdByEmail: string; createdAt: number };
export type NoteTargetType = "user" | "crew" | "support";

export type TaskStatus = "todo" | "in_progress" | "done";
export type AdminTask = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  assignedAdminId: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export type RoadmapStatus = "planned" | "in_progress" | "shipped";
export type AdminRoadmapItem = {
  id: number;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  displayOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ChartPoint = { date: string; count: number };
export type LabelCount = { label: string; count: number };
export type AdminAnalytics = {
  workoutsByDay: ChartPoint[];
  crewsByDay: ChartPoint[];
  crewsByPrivacy: LabelCount[];
  crewsByDivision: LabelCount[];
  reportsByReason: LabelCount[];
  supportByDay: ChartPoint[];
};

// ---- First-party product analytics (see backend/routes/analytics-events.php, track.php) ----
export type EventsOverview = {
  activeUsersTrend: ChartPoint[];
  topScreens: LabelCount[];
  topActions: LabelCount[];
  avgSessionDurationSeconds: number;
};

export type UserActivity = { events: { event: string; label: string | null; timestamp: string }[] };

export type UserRecord = { exerciseId: string; exerciseName: string; weightKg: number; reps: number; achievedAt: number };
export type UserWorkout = { id: string; name: string; completedAt: number; durationSeconds: number; volumeKg: number; completedSets: number };

export const api = {
  login: (email: string, password: string, code?: string) =>
    request<{ token: string; admin: AdminUser } | { requiresTotp: true }>("/login", { method: "POST", body: { email, password, code } }),
  me: () => request<AdminUser>("/me"),

  getStats: () => request<DashboardStats>("/stats"),
  getLiveNow: () => request<LiveNow>("/live-now"),
  getActivityFeed: () => request<{ entries: ActivityFeedEntry[] }>("/activity-feed"),
  getLaunchPerformance: (period: LaunchPeriod) => request<LaunchPerformance>(`/launch-performance?period=${period}`),
  getProductFunnel: () => request<ProductFunnel>("/product-funnel"),
  getWorkoutAnalytics: () => request<WorkoutAnalytics>("/workout-analytics"),
  getCrewAnalytics: () => request<CrewAnalytics>("/crew-analytics"),
  getRankingAnalytics: () => request<RankingAnalytics>("/ranking-analytics"),
  getRetention: () => request<Retention>("/retention"),
  getPwaAdoption: () => request<PwaAdoption>("/pwa-adoption"),
  getInsights: () => request<Insights>("/insights"),
  getActivityHeatmap: () => request<ActivityHeatmap>("/activity-heatmap"),

  // ---- Event Log ----
  getEventLog: (params: { userId?: string; eventType?: string; search?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set("userId", params.userId);
    if (params.eventType) qs.set("eventType", params.eventType);
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    // Named "journal", not "event-log" — some ad blockers silently kill any URL containing
    // "event" as a generic analytics-tracking heuristic (confirmed: showed as a blocked request
    // with zero response in the browser).
    return request<{ entries: EventLogEntry[]; total: number; page: number; limit: number }>(`/journal?${qs.toString()}`);
  },
  getEventTypes: () => request<{ eventTypes: string[] }>("/journal/types"),

  getUsers: (params: { search?: string; page?: number; limit?: number; filter?: UsersFilter } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.filter) qs.set("filter", params.filter);
    return request<{ users: AdminUserListItem[]; total: number; page: number; limit: number }>(`/users?${qs.toString()}`);
  },
  getUser: (id: string) => request<AdminUserDetail>(`/users/${id}`),
  setUserBanned: (id: string, banned: boolean) => request<{ ok: true }>(`/users/${id}`, { method: "PUT", body: { banned } }),
  deleteUser: (id: string) => request<{ ok: true }>(`/users/${id}`, { method: "DELETE" }),
  updateUserProfile: (id: string, fields: UserProfileUpdate) => request<AdminUserDetail>(`/users/${id}/profile`, { method: "PUT", body: fields }),
  /** Write-only: there is no way to read a password back, only to set a new one. */
  setUserPassword: (id: string, password: string, signOutEverywhere: boolean) =>
    request<{ ok: true }>(`/users/${id}/password`, { method: "POST", body: { password, signOutEverywhere } }),
  signOutUser: (id: string) => request<{ ok: true; revoked: number }>(`/users/${id}/sign-out`, { method: "POST" }),

  // ---- User Detail: behavior / ranks / workouts / crew management ----
  getUserActivity: (id: string) => request<UserActivity>(`/users/${id}/activity`),
  getUserRecords: (id: string) => request<UserRecord[]>(`/users/${id}/records`),
  updateUserRecord: (id: string, exerciseId: string, weightKg: number, reps: number) =>
    request<{ ok: true }>(`/users/${id}/records`, { method: "PUT", body: { exerciseId, weightKg, reps } }),
  getUserWorkouts: (id: string) => request<UserWorkout[]>(`/users/${id}/workouts`),
  moveUserCrew: (id: string, crewId: string | null) => request<{ ok: true }>(`/users/${id}/crew`, { method: "PUT", body: { crewId } }),

  getCrews: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return request<{ crews: AdminCrewListItem[]; total: number; page: number; limit: number }>(`/crews?${qs.toString()}`);
  },
  getCrew: (id: string) => request<AdminCrewDetail>(`/crews/${id}`),
  setCrewDisabled: (id: string, disabled: boolean) => request<{ ok: true }>(`/crews/${id}`, { method: "PUT", body: { disabled } }),
  deleteCrew: (id: string) => request<{ ok: true }>(`/crews/${id}`, { method: "DELETE" }),

  getReports: (status?: "open" | "resolved") => request<AdminReport[]>(`/reports${status ? `?status=${status}` : ""}`),
  resolveReport: (id: number) => request<{ ok: true }>(`/reports/${id}`, { method: "PUT", body: { status: "resolved" } }),

  getSupportMessages: (status?: "open" | "resolved") => request<AdminSupportMessage[]>(`/support${status ? `?status=${status}` : ""}`),
  getSupportDetail: (id: number) => request<AdminSupportDetail>(`/support/${id}`),
  resolveSupportMessage: (id: number) => request<{ ok: true }>(`/support/${id}`, { method: "PUT", body: { status: "resolved" } }),
  reopenSupportMessage: (id: number) => request<{ ok: true }>(`/support/${id}`, { method: "PUT", body: { status: "open" } }),
  replySupportTicket: (id: number, body: string) => request<{ ok: true }>(`/support/${id}/reply`, { method: "POST", body: { body } }),

  getNotes: (targetType: NoteTargetType, targetId: string) =>
    request<AdminNote[]>(`/notes?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`),
  createNote: (targetType: NoteTargetType, targetId: string, note: string) =>
    request<{ ok: true }>("/notes", { method: "POST", body: { targetType, targetId, note } }),
  deleteNote: (id: number) => request<{ ok: true }>(`/notes/${id}`, { method: "DELETE" }),

  getTasks: () => request<AdminTask[]>("/tasks"),
  createTask: (data: { title: string; description?: string; status?: TaskStatus; dueDate?: string | null; assignedAdminId?: string | null }) =>
    request<{ id: number }>("/tasks", { method: "POST", body: data }),
  updateTask: (id: number, data: Partial<{ title: string; description: string; status: TaskStatus; dueDate: string | null; assignedAdminId: string | null }>) =>
    request<{ ok: true }>(`/tasks/${id}`, { method: "PUT", body: data }),
  deleteTask: (id: number) => request<{ ok: true }>(`/tasks/${id}`, { method: "DELETE" }),

  getRoadmap: () => request<AdminRoadmapItem[]>("/roadmap"),
  createRoadmapItem: (data: { title: string; description?: string; status?: RoadmapStatus }) =>
    request<{ id: number }>("/roadmap", { method: "POST", body: data }),
  updateRoadmapItem: (id: number, data: Partial<{ title: string; description: string; status: RoadmapStatus; displayOrder: number }>) =>
    request<{ ok: true }>(`/roadmap/${id}`, { method: "PUT", body: data }),
  deleteRoadmapItem: (id: number) => request<{ ok: true }>(`/roadmap/${id}`, { method: "DELETE" }),

  getAnalytics: () => request<AdminAnalytics>("/analytics"),
  getEventsOverview: () => request<EventsOverview>("/analytics/events"),

  getAdmins: () => request<{ id: string; email: string; createdAt: number }[]>("/admins"),
  createAdmin: (email: string, password: string) => request<{ id: string; email: string }>("/admins", { method: "POST", body: { email, password } }),
  deleteAdmin: (id: string) => request<{ ok: true }>(`/admins/${id}`, { method: "DELETE" }),

  // ---- Banners & popups shown in the app ----
  getBanners: () => request<AdminBanner[]>("/banners"),
  createBanner: (banner: BannerInput) => request<{ ok: true; id: number }>("/banners", { method: "POST", body: banner }),
  updateBanner: (id: number, fields: Partial<BannerInput>) => request<{ ok: true }>(`/banners/${id}`, { method: "PUT", body: fields }),
  deleteBanner: (id: number) => request<{ ok: true }>(`/banners/${id}`, { method: "DELETE" }),

  sendBroadcastEmail: (subject: string, body: string, bodyHtml: string, audience: "all" | "single" | "founding", userId?: string) =>
    request<{ ok: true; sent: number; total: number }>("/email/broadcast", { method: "POST", body: { subject, body, bodyHtml, audience, userId } }),

  // ---- Audit log ----
  getAuditLog: (page = 1) => request<{ entries: AuditLogEntry[]; total: number; page: number; limit: number }>(`/audit-log?page=${page}`),

  // ---- Settings ----
  getSettings: () => request<Record<string, string>>("/settings"),
  updateSetting: (key: string, value: string) => request<{ ok: true }>("/settings", { method: "PUT", body: { key, value } }),

  // ---- 2FA ----
  enrollTotp: () => request<{ secret: string; otpauthUrl: string }>("/2fa/enroll", { method: "POST" }),
  confirmTotp: (secret: string, code: string) => request<{ ok: true }>("/2fa/confirm", { method: "POST", body: { secret, code } }),
  disableTotp: () => request<{ ok: true }>("/2fa/disable", { method: "POST" }),

  // ---- Rank / PR moderation ----
  getTopRecords: (limit = 50) => request<TopRecord[]>(`/records/top?limit=${limit}`),
  deleteRecord: (userId: string, exerciseId: string) => request<{ ok: true }>("/records/delete", { method: "POST", body: { userId, exerciseId } }),

  getSocialSubmissions: () => request<SocialSubmission[]>("/socials"),
  reviewSocialSubmission: (userId: string, isPromoting: boolean | null, notes?: string) =>
    request<{ ok: true }>(`/socials/${userId}/review`, { method: "POST", body: { isPromoting, notes } }),

  /** Sends a blocking-until-dismissed in-app overlay message (not a push notification, see
   * PushComposer for that) to one or more specific users — e.g. warning an unverified account
   * before it loses access. */
  sendAdminMessage: (userIds: string[], message: string) =>
    request<{ ok: true; sent: number }>("/messages/send", { method: "POST", body: { userIds, message } }),

  // ---- Crew Wars moderation ----
  getActiveCrewWars: () => request<ActiveCrewWar[]>("/crew-wars/active"),
  forceEndCrewWar: (id: string) => request<{ ok: true }>(`/crew-wars/${id}/end`, { method: "POST" }),

  // ---- Push notification composer ----
  sendPushBroadcast: (title: string, body: string, audience: "all" | "crew" | "single", crewId?: string, userId?: string) =>
    request<{ ok: true; sent: number }>("/push/broadcast", { method: "POST", body: { title, body, audience, crewId, userId } }),

  // ---- Onboarding funnel ----
  getOnboardingFunnel: () => request<{ step: string; count: number }[]>("/onboarding-funnel"),

  // ---- Reports Center / exports ----
  exportUsers: () => request<Record<string, unknown>[]>("/export/users"),
  exportCrews: () => request<Record<string, unknown>[]>("/export/crews"),
  exportWorkoutSummary: () => request<Record<string, unknown>[]>("/export/workouts"),

  // ---- Changelog ----
  getChangelog: () => request<ChangelogEntry[]>("/changelog"),
  createChangelogEntry: (data: { version: string; title: string; description?: string }) => request<{ id: number }>("/changelog", { method: "POST", body: data }),
  deleteChangelogEntry: (id: number) => request<{ ok: true }>(`/changelog/${id}`, { method: "DELETE" }),

  // ---- FAQ ----
  getAdminFaq: () => request<FaqItem[]>("/faq"),
  createFaqItem: (data: { question: string; answer: string; displayOrder?: number }) => request<{ id: number }>("/faq", { method: "POST", body: data }),
  updateFaqItem: (id: number, data: Partial<{ question: string; answer: string; displayOrder: number }>) => request<{ ok: true }>(`/faq/${id}`, { method: "PUT", body: data }),
  deleteFaqItem: (id: number) => request<{ ok: true }>(`/faq/${id}`, { method: "DELETE" }),

  // ---- Feedback board ----
  getAdminFeedback: () => request<AdminFeedbackItem[]>("/feedback"),
  updateAdminFeedback: (id: number, status: FeedbackStatus) => request<{ ok: true }>(`/feedback/${id}`, { method: "PUT", body: { status } }),
  deleteAdminFeedback: (id: number) => request<{ ok: true }>(`/feedback/${id}`, { method: "DELETE" }),

  // ---- Status page ----
  getStatusHistory: () => request<StatusUpdate[]>("/status"),
  createStatusUpdate: (status: SystemStatus, message?: string) => request<{ ok: true }>("/status", { method: "POST", body: { status, message } }),
};

export type AuditLogEntry = {
  id: number;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  createdAt: number;
};

export type TopRecord = {
  userId: string;
  userName: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  achievedAt: number;
};

export type SocialSubmission = {
  userId: string;
  userName: string;
  instagramHandle: string;
  tiktokHandle: string;
  submittedAt: number;
  reviewedAt: number | null;
  reviewedBy: string | null;
  isPromoting: boolean | null;
  adminNotes: string;
  /** Never reviewed, or last reviewed more than a week ago — see admin-ops.php's
   * SOCIAL_REVIEW_STALE_MS. Nothing runs this check automatically; it's just a flag so a weekly
   * review habit has something concrete to work off. */
  needsRecheck: boolean;
};

export type ActiveCrewWar = {
  id: string;
  crewAId: string;
  crewAName: string;
  crewAScore: number;
  crewBId: string;
  crewBName: string;
  crewBScore: number;
  startedAt: number;
  endsAt: number;
};

export type ChangelogEntry = { id: number; version: string; title: string; description: string | null; createdAt: number };
export type FaqItem = { id: number; question: string; answer: string; displayOrder: number };

export type FeedbackStatus = "open" | "planned" | "declined" | "shipped";
export type AdminFeedbackItem = {
  id: number;
  title: string;
  description: string | null;
  status: FeedbackStatus;
  votesCount: number;
  userName: string;
  createdAt: number;
};

export type SystemStatus = "operational" | "degraded" | "down";
export type StatusUpdate = { id: number; status: SystemStatus; message: string | null; createdAt: number };
