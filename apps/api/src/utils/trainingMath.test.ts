import assert from "node:assert/strict";
import test from "node:test";
import { estimateOneRepMax, setVolume } from "./trainingMath";

test("estimates one-rep max with the Epley formula", () => {
  assert.equal(estimateOneRepMax(100, 1), 103.33333333333334);
  assert.equal(estimateOneRepMax(80, 10), 106.66666666666666);
});

test("calculates training volume", () => {
  assert.equal(setVolume(82.5, 8), 660);
  assert.equal(setVolume(0, 12), 0);
});

test("rejects values outside the API domain", () => {
  assert.throws(() => estimateOneRepMax(-1, 5), /Weight/);
  assert.throws(() => estimateOneRepMax(100, 0), /Reps/);
  assert.throws(() => setVolume(Number.NaN, 5), /Weight/);
  assert.throws(() => setVolume(100, 2.5), /Reps/);
});
