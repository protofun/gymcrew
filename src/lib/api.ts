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

export const api = {
  getProfile: () => request<ApiProfile>("/profile"),
  updateProfile: (data: Partial<Omit<ApiProfile, "id">>) => request<ApiProfile>("/profile", { method: "PUT", body: data }),

  getWorkouts: () => request<CompletedWorkout[]>("/workouts"),
  createWorkout: (workout: CompletedWorkout) => request<{ ok: true }>("/workouts", { method: "POST", body: workout }),
  updateWorkoutNotes: (id: string, notes: string) => request<{ ok: true }>(`/workouts/${id}`, { method: "PUT", body: { notes } }),

  getRecords: () => request<Record<string, PersonalRecord>>("/records"),
  checkAndRecord: (input: { exerciseId: string; exerciseName: string; weightKg: number; reps: number }) =>
    request<PrCheckResponse>("/records", { method: "POST", body: input }),

  getBodyLog: () => request<BodyLogEntry[]>("/body-log"),
  addBodyLogEntry: (entry: { weightKg: number; bodyFatPercent: number | null }) =>
    request<BodyLogEntry>("/body-log", { method: "POST", body: entry }),
  removeBodyLogEntry: (id: string) => request<{ ok: true }>(`/body-log/${id}`, { method: "DELETE" }),
};
