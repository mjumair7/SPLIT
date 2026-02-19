"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createSession,
  createSplit,
  deleteSplit,
  getExerciseProgress,
  getExercises,
  getSessions,
  getSplits,
  getSummary,
  login,
  register
} from "../lib/api";
import type { DayOfWeek, Exercise, ExerciseProgress, Summary, WorkoutSession, WorkoutSplit } from "../lib/types";

const dayOptions: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY"
];

type SplitExerciseDraft = {
  exerciseId: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
};

type SplitDayDraft = {
  dayOfWeek: DayOfWeek;
  focus: string;
  exercises: SplitExerciseDraft[];
};

type SessionSetDraft = {
  reps: number;
  weightKg: number;
  rpe?: number;
};

type SessionExerciseDraft = {
  exerciseId: string;
  sets: SessionSetDraft[];
};

const emptySplitDay = (): SplitDayDraft => ({
  dayOfWeek: "MONDAY",
  focus: "",
  exercises: [
    {
      exerciseId: "",
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 12
    }
  ]
});

const emptySessionExercise = (): SessionExerciseDraft => ({
  exerciseId: "",
  sets: [{ reps: 10, weightKg: 0 }]
});

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Alex Lifter");
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("password123");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [splits, setSplits] = useState<WorkoutSplit[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");

  const [loadingData, setLoadingData] = useState(false);
  const [submittingSplit, setSubmittingSplit] = useState(false);
  const [submittingSession, setSubmittingSession] = useState(false);

  const [splitName, setSplitName] = useState("Push Pull Legs");
  const [splitGoal, setSplitGoal] = useState("Build strength while increasing training frequency");
  const [splitDays, setSplitDays] = useState<SplitDayDraft[]>([emptySplitDay()]);

  const [sessionSplitDayId, setSessionSplitDayId] = useState<string>("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseDraft[]>([emptySessionExercise()]);

  const splitDayOptions = useMemo(
    () =>
      splits.flatMap((split) =>
        split.days.map((day) => ({
          id: day.id,
          label: `${split.name} • ${day.dayOfWeek} (${day.focus ?? "No focus"})`,
          day
        }))
      ),
    [splits]
  );

  async function loadBaseData(currentToken: string) {
    setLoadingData(true);
    setError(null);

    try {
      const [exerciseResponse, splitResponse, sessionResponse, summaryResponse] = await Promise.all([
        getExercises(currentToken),
        getSplits(currentToken),
        getSessions(currentToken),
        getSummary(currentToken)
      ]);

      setExercises(exerciseResponse.exercises);
      setSplits(splitResponse.splits);
      setSessions(sessionResponse.sessions);
      setSummary(summaryResponse);

      const firstExerciseId = exerciseResponse.exercises[0]?.id;
      if (firstExerciseId) {
        setSelectedExerciseId(firstExerciseId);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not load data";
      setError(message);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem("split_token");
    if (!storedToken) {
      return;
    }

    setToken(storedToken);
    void loadBaseData(storedToken);
  }, []);

  useEffect(() => {
    if (!token || !selectedExerciseId) {
      return;
    }

    void (async () => {
      try {
        const nextProgress = await getExerciseProgress(token, selectedExerciseId);
        setProgress(nextProgress);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Failed to load analytics";
        setError(message);
      }
    })();
  }, [token, selectedExerciseId]);

  async function handleAuthSubmit(event: FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const response =
        mode === "register"
          ? await register({ name, email, password })
          : await login({ email, password });

      localStorage.setItem("split_token", response.token);
      setToken(response.token);
      await loadBaseData(response.token);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Authentication failed";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateSplit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmittingSplit(true);
    setError(null);

    try {
      await createSplit(token, {
        name: splitName,
        goal: splitGoal,
        days: splitDays.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          focus: day.focus,
          exercises: day.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            targetSets: Number(exercise.targetSets),
            targetRepMin: Number(exercise.targetRepMin),
            targetRepMax: Number(exercise.targetRepMax),
            position: index + 1
          }))
        }))
      });

      setSplitName("Upper Lower");
      setSplitGoal("Balanced hypertrophy and strength");
      setSplitDays([emptySplitDay()]);
      await loadBaseData(token);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to create split";
      setError(message);
    } finally {
      setSubmittingSplit(false);
    }
  }

  async function handleDeleteSplit(splitId: string) {
    if (!token) {
      return;
    }

    try {
      await deleteSplit(token, splitId);
      await loadBaseData(token);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to delete split";
      setError(message);
    }
  }

  async function handleLogSession(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmittingSession(true);
    setError(null);

    try {
      await createSession(token, {
        splitDayId: sessionSplitDayId || undefined,
        notes: sessionNotes || undefined,
        exercises: sessionExercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets.map((set, index) => ({
            setNumber: index + 1,
            reps: Number(set.reps),
            weightKg: Number(set.weightKg),
            ...(set.rpe ? { rpe: Number(set.rpe) } : {})
          }))
        }))
      });

      setSessionNotes("");
      setSessionSplitDayId("");
      setSessionExercises([emptySessionExercise()]);
      await loadBaseData(token);
      if (selectedExerciseId) {
        setProgress(await getExerciseProgress(token, selectedExerciseId));
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to log workout";
      setError(message);
    } finally {
      setSubmittingSession(false);
    }
  }

  function loadTemplateFromSplitDay(splitDayId: string) {
    setSessionSplitDayId(splitDayId);

    const splitDay = splitDayOptions.find((option) => option.id === splitDayId)?.day;
    if (!splitDay) {
      return;
    }

    const template = splitDay.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Array.from({ length: exercise.targetSets }).map(() => ({
        reps: exercise.targetRepMin,
        weightKg: 0
      }))
    }));

    setSessionExercises(template.length > 0 ? template : [emptySessionExercise()]);
  }

  function logout() {
    localStorage.removeItem("split_token");
    setToken(null);
    setExercises([]);
    setSplits([]);
    setSessions([]);
    setSummary(null);
    setProgress(null);
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
        <div className="panel grid w-full gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex rounded-full bg-blaze/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blaze">
              Split Training Platform
            </p>
            <h1 className="mt-4 text-4xl font-bold text-ink">Design your split. Track every set. Beat your PRs.</h1>
            <p className="mt-4 max-w-xl text-ink/75">
              Full-stack gym tracking app with split planning, validated workout logging, and performance analytics.
            </p>
            <div className="mt-6 rounded-2xl border border-lake/25 bg-lake/10 p-4 text-sm text-ink">
              <p>Interview framing: this project demonstrates API design, database normalization, validation, transactions, and chart-driven UX.</p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="panel border border-ink/10 bg-white">
            <h2 className="text-2xl font-bold text-ink">{mode === "register" ? "Create account" : "Login"}</h2>
            <p className="mt-1 text-sm text-ink/70">Use your own values or keep defaults to test locally.</p>

            {mode === "register" ? (
              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-semibold">Name</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
            ) : null}

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <button className="button mt-5 w-full" disabled={authLoading} type="submit">
              {authLoading ? "Please wait..." : mode === "register" ? "Register" : "Login"}
            </button>

            <button
              className="button-secondary mt-3 w-full"
              type="button"
              onClick={() => setMode(mode === "register" ? "login" : "register")}
            >
              {mode === "register" ? "Already have an account? Login" : "Need an account? Register"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8">
      <header className="panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lake">Split App Dashboard</p>
          <h1 className="text-3xl font-bold text-ink">Training Command Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="button-secondary" onClick={() => token && loadBaseData(token)}>
            Refresh
          </button>
          <button className="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error ? (
        <div className="panel border border-red-300 bg-red-50 text-sm text-red-700">Error: {error}</div>
      ) : null}

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="panel">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Sessions This Month</p>
            <p className="mt-2 text-3xl font-bold">{summary.sessionsThisMonth}</p>
          </article>
          <article className="panel">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Volume This Month</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalVolumeKg.toFixed(0)} kg</p>
          </article>
          <article className="panel">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">Total Reps</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalReps}</p>
          </article>
          <article className="panel">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/60">PRs This Month</p>
            <p className="mt-2 text-3xl font-bold">{summary.prsThisMonth}</p>
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="panel space-y-4" onSubmit={handleCreateSplit}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-moss">Create Workout Split</p>
            <h2 className="text-2xl font-bold">Program Builder</h2>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Split Name</span>
            <input className="input" value={splitName} onChange={(event) => setSplitName(event.target.value)} required />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Goal</span>
            <input className="input" value={splitGoal} onChange={(event) => setSplitGoal(event.target.value)} />
          </label>

          {splitDays.map((day, dayIndex) => (
            <div key={`day-${dayIndex}`} className="rounded-2xl border border-ink/10 bg-white/60 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">Day</span>
                  <select
                    className="input"
                    value={day.dayOfWeek}
                    onChange={(event) => {
                      const next = [...splitDays];
                      next[dayIndex].dayOfWeek = event.target.value as DayOfWeek;
                      setSplitDays(next);
                    }}
                  >
                    {dayOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-ink/70">Focus</span>
                  <input
                    className="input"
                    value={day.focus}
                    onChange={(event) => {
                      const next = [...splitDays];
                      next[dayIndex].focus = event.target.value;
                      setSplitDays(next);
                    }}
                    placeholder="Push / Pull / Legs"
                  />
                </label>

                <button
                  className="button-secondary self-end"
                  disabled={splitDays.length === 1}
                  onClick={() => {
                    setSplitDays(splitDays.filter((_, index) => index !== dayIndex));
                  }}
                  type="button"
                >
                  Remove Day
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={`day-${dayIndex}-exercise-${exerciseIndex}`} className="grid gap-2 md:grid-cols-4">
                    <select
                      className="input"
                      value={exercise.exerciseId}
                      onChange={(event) => {
                        const next = [...splitDays];
                        next[dayIndex].exercises[exerciseIndex].exerciseId = event.target.value;
                        setSplitDays(next);
                      }}
                      required
                    >
                      <option value="">Select exercise</option>
                      {exercises.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={exercise.targetSets}
                      onChange={(event) => {
                        const next = [...splitDays];
                        next[dayIndex].exercises[exerciseIndex].targetSets = Number(event.target.value);
                        setSplitDays(next);
                      }}
                      placeholder="Sets"
                    />

                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={exercise.targetRepMin}
                      onChange={(event) => {
                        const next = [...splitDays];
                        next[dayIndex].exercises[exerciseIndex].targetRepMin = Number(event.target.value);
                        setSplitDays(next);
                      }}
                      placeholder="Rep Min"
                    />

                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={exercise.targetRepMax}
                      onChange={(event) => {
                        const next = [...splitDays];
                        next[dayIndex].exercises[exerciseIndex].targetRepMax = Number(event.target.value);
                        setSplitDays(next);
                      }}
                      placeholder="Rep Max"
                    />
                  </div>
                ))}

                <button
                  className="button-secondary"
                  onClick={() => {
                    const next = [...splitDays];
                    next[dayIndex].exercises.push({
                      exerciseId: "",
                      targetSets: 3,
                      targetRepMin: 8,
                      targetRepMax: 12
                    });
                    setSplitDays(next);
                  }}
                  type="button"
                >
                  Add Exercise
                </button>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button className="button-secondary" type="button" onClick={() => setSplitDays([...splitDays, emptySplitDay()])}>
              Add Day
            </button>
            <button className="button" type="submit" disabled={submittingSplit}>
              {submittingSplit ? "Saving..." : "Save Split"}
            </button>
          </div>
        </form>

        <aside className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-moss">Saved Splits</p>
            <h2 className="text-2xl font-bold">Your Programs</h2>
          </div>

          {loadingData ? <p className="text-sm text-ink/70">Loading...</p> : null}

          <div className="space-y-3">
            {splits.map((split) => (
              <article key={split.id} className="rounded-2xl border border-ink/10 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{split.name}</h3>
                    <p className="text-sm text-ink/70">{split.goal ?? "No goal specified"}</p>
                  </div>
                  <button className="button-secondary" onClick={() => handleDeleteSplit(split.id)} type="button">
                    Delete
                  </button>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-ink/80">
                  {split.days.map((day) => (
                    <li key={day.id}>
                      <span className="font-semibold">{day.dayOfWeek}</span> • {day.focus ?? "No focus"} • {day.exercises.length} exercise(s)
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {splits.length === 0 ? <p className="text-sm text-ink/70">No splits yet.</p> : null}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="panel space-y-4" onSubmit={handleLogSession}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lake">Log Workout Session</p>
            <h2 className="text-2xl font-bold">Session Tracker</h2>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Split Day (optional)</span>
            <select
              className="input"
              value={sessionSplitDayId}
              onChange={(event) => setSessionSplitDayId(event.target.value)}
            >
              <option value="">No linked split day</option>
              {splitDayOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              if (sessionSplitDayId) {
                loadTemplateFromSplitDay(sessionSplitDayId);
              }
            }}
          >
            Load Split-Day Template
          </button>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Notes</span>
            <input
              className="input"
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              placeholder="Felt strong today, increased load on final sets"
            />
          </label>

          <div className="space-y-4">
            {sessionExercises.map((exercise, exerciseIndex) => (
              <div key={`session-exercise-${exerciseIndex}`} className="rounded-2xl border border-ink/10 bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <select
                    className="input"
                    value={exercise.exerciseId}
                    onChange={(event) => {
                      const next = [...sessionExercises];
                      next[exerciseIndex].exerciseId = event.target.value;
                      setSessionExercises(next);
                    }}
                    required
                  >
                    <option value="">Select exercise</option>
                    {exercises.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      setSessionExercises(sessionExercises.filter((_, index) => index !== exerciseIndex));
                    }}
                    disabled={sessionExercises.length === 1}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={`set-${setIndex}`} className="grid gap-2 md:grid-cols-4">
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={setIndex + 1}
                        readOnly
                        aria-label="Set number"
                      />
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={set.reps}
                        onChange={(event) => {
                          const next = [...sessionExercises];
                          next[exerciseIndex].sets[setIndex].reps = Number(event.target.value);
                          setSessionExercises(next);
                        }}
                        placeholder="Reps"
                      />
                      <input
                        className="input"
                        type="number"
                        min={0}
                        step={0.5}
                        value={set.weightKg}
                        onChange={(event) => {
                          const next = [...sessionExercises];
                          next[exerciseIndex].sets[setIndex].weightKg = Number(event.target.value);
                          setSessionExercises(next);
                        }}
                        placeholder="Weight (kg)"
                      />
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={set.rpe ?? ""}
                        onChange={(event) => {
                          const next = [...sessionExercises];
                          next[exerciseIndex].sets[setIndex].rpe =
                            event.target.value === "" ? undefined : Number(event.target.value);
                          setSessionExercises(next);
                        }}
                        placeholder="RPE"
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="button-secondary mt-3"
                  type="button"
                  onClick={() => {
                    const next = [...sessionExercises];
                    next[exerciseIndex].sets.push({ reps: 8, weightKg: 0 });
                    setSessionExercises(next);
                  }}
                >
                  Add Set
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              className="button-secondary"
              type="button"
              onClick={() => setSessionExercises([...sessionExercises, emptySessionExercise()])}
            >
              Add Exercise
            </button>
            <button className="button" type="submit" disabled={submittingSession}>
              {submittingSession ? "Saving..." : "Log Session"}
            </button>
          </div>
        </form>

        <div className="panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lake">Performance Analytics</p>
            <h2 className="text-2xl font-bold">Progress Chart</h2>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Exercise</span>
            <select
              className="input"
              value={selectedExerciseId}
              onChange={(event) => setSelectedExerciseId(event.target.value)}
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>

          <div className="h-[300px] rounded-2xl border border-ink/10 bg-white/70 p-2">
            {progress?.points.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress.points}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#d6d6cd" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bestWeight"
                    stroke="#ff6b35"
                    strokeWidth={2.5}
                    name="Best Weight (kg)"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bestEstimatedOneRepMax"
                    stroke="#1c7293"
                    strokeWidth={2.5}
                    name="Estimated 1RM (kg)"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink/70">
                No workout data yet for this exercise.
              </div>
            )}
          </div>

          {progress ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-ink/10 bg-white/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-ink/65">Max Weight Record</p>
                <p className="mt-1 text-2xl font-bold">{progress.records.maxWeightKg?.toFixed(1) ?? "-"} kg</p>
              </article>
              <article className="rounded-xl border border-ink/10 bg-white/60 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-ink/65">Estimated 1RM Record</p>
                <p className="mt-1 text-2xl font-bold">
                  {progress.records.estimatedOneRepMaxKg?.toFixed(1) ?? "-"} kg
                </p>
              </article>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-moss">Recent Sessions</p>
          <h2 className="text-2xl font-bold">Workout Log Timeline</h2>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => (
            <article key={session.id} className="rounded-2xl border border-ink/10 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">
                  {new Date(session.performedAt).toLocaleString()} {session.splitDay ? `• ${session.splitDay.split.name}` : ""}
                </h3>
                <p className="text-sm text-ink/70">{session.sets.length} total sets</p>
              </div>
              {session.notes ? <p className="mt-2 text-sm text-ink/80">{session.notes}</p> : null}
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-ink/60">
                    <tr>
                      <th className="px-2 py-1">Exercise</th>
                      <th className="px-2 py-1">Set</th>
                      <th className="px-2 py-1">Reps</th>
                      <th className="px-2 py-1">Weight (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.sets.map((set) => (
                      <tr key={set.id} className="border-t border-ink/10">
                        <td className="px-2 py-1">{set.exercise.name}</td>
                        <td className="px-2 py-1">{set.setNumber}</td>
                        <td className="px-2 py-1">{set.reps}</td>
                        <td className="px-2 py-1">{set.weightKg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
          {sessions.length === 0 ? <p className="text-sm text-ink/70">No sessions logged yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
