import type {
  AuthResponse,
  Exercise,
  ExerciseProgress,
  Summary,
  WorkoutSession,
  WorkoutSplit
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  token?: string;
  body?: unknown;
};

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  if (response.status === 204) {
    return {} as T;
  }

  const payload = (await response.json()) as { message?: string } & T;

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed");
  }

  return payload;
}

export function register(input: { email: string; password: string; name: string }) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: input
  });
}

export function login(input: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: input
  });
}

export function getMe(token: string) {
  return apiFetch<{ user: { userId: string; email: string } }>("/me", { token });
}

export function getExercises(token: string) {
  return apiFetch<{ exercises: Exercise[] }>("/exercises", { token });
}

export function getSplits(token: string) {
  return apiFetch<{ splits: WorkoutSplit[] }>("/splits", { token });
}

export function createSplit(token: string, body: unknown) {
  return apiFetch<{ split: WorkoutSplit }>("/splits", {
    method: "POST",
    token,
    body
  });
}

export function deleteSplit(token: string, splitId: string) {
  return apiFetch<Record<string, never>>(`/splits/${splitId}`, {
    method: "DELETE",
    token
  });
}

export function createSession(token: string, body: unknown) {
  return apiFetch<{ session: WorkoutSession }>("/workouts/sessions", {
    method: "POST",
    token,
    body
  });
}

export function getSessions(token: string, limit = 10) {
  return apiFetch<{ sessions: WorkoutSession[] }>(`/workouts/sessions?limit=${limit}`, { token });
}

export function getSummary(token: string) {
  return apiFetch<Summary>("/analytics/summary", { token });
}

export function getExerciseProgress(token: string, exerciseId: string) {
  return apiFetch<ExerciseProgress>(`/analytics/exercise/${exerciseId}/progress`, {
    token
  });
}
