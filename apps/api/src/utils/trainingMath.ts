export function estimateOneRepMax(weightKg: number, reps: number) {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError("Weight must be a non-negative number");
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError("Reps must be a positive integer");
  }

  return weightKg * (1 + reps / 30);
}

export function setVolume(weightKg: number, reps: number) {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError("Weight must be a non-negative number");
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError("Reps must be a positive integer");
  }

  return weightKg * reps;
}
