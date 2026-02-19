export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Exercise = {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string | null;
};

export type SplitDayExercise = {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  position: number;
  exercise: Exercise;
};

export type SplitDay = {
  id: string;
  dayOfWeek: DayOfWeek;
  focus: string | null;
  exercises: SplitDayExercise[];
};

export type WorkoutSplit = {
  id: string;
  name: string;
  goal: string | null;
  createdAt: string;
  days: SplitDay[];
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string;
  };
};

export type WorkoutSession = {
  id: string;
  performedAt: string;
  notes: string | null;
  splitDay: {
    id: string;
    dayOfWeek: DayOfWeek;
    focus: string | null;
    split: {
      id: string;
      name: string;
    };
  } | null;
  sets: WorkoutSet[];
};

export type AnalyticsPoint = {
  date: string;
  bestWeight: number;
  bestEstimatedOneRepMax: number;
  totalReps: number;
  totalVolume: number;
};

export type ExerciseProgress = {
  exercise: Exercise;
  points: AnalyticsPoint[];
  records: {
    maxWeightKg: number | null;
    estimatedOneRepMaxKg: number | null;
  };
};

export type Summary = {
  sessionsThisMonth: number;
  totalVolumeKg: number;
  totalReps: number;
  prsThisMonth: number;
  lastSessionAt: string | null;
};
