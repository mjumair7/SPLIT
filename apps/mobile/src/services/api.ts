const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed");
  }

  return data;
}

export function register(input: { name: string; email: string; password: string }) {
  return request<{ token: string }>("/auth/register", {
    method: "POST",
    body: input
  });
}

export function login(input: { email: string; password: string }) {
  return request<{ token: string }>("/auth/login", {
    method: "POST",
    body: input
  });
}

export function fetchSplits(token: string) {
  return request<{ splits: Array<{ id: string; name: string; goal: string | null }> }>("/splits", {
    token
  });
}

export function fetchExercises(token: string) {
  return request<{ exercises: Array<{ id: string; name: string }> }>("/exercises", {
    token
  });
}

export function logQuickSession(token: string, input: { exerciseId: string; reps: number; weightKg: number }) {
  return request<{ session: { id: string } }>("/workouts/sessions", {
    method: "POST",
    token,
    body: {
      exercises: [
        {
          exerciseId: input.exerciseId,
          sets: [
            {
              setNumber: 1,
              reps: input.reps,
              weightKg: input.weightKg
            }
          ]
        }
      ]
    }
  });
}
