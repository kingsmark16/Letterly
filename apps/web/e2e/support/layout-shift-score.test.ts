import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutShiftScore } from "./layout-shift-score";

test("a stable page has zero observed layout shift", () => {
  assert.equal(layoutShiftScore([]), 0);
});

test("nearby shifts accumulate within one session", () => {
  assert.ok(
    Math.abs(
      layoutShiftScore([
        { time: 100, value: 0.1 },
        { time: 500, value: 0.2 },
      ]) - 0.3,
    ) < 1e-10,
  );
});

test("a gap of one second starts another session", () => {
  assert.equal(
    layoutShiftScore([
      { time: 100, value: 0.1 },
      { time: 1_100, value: 0.2 },
    ]),
    0.2,
  );
});

test("a session starts at its first shift rather than navigation time", () => {
  const shifts = [800, 1_600, 2_400, 3_200, 4_000, 4_800, 5_600].map(
    (time) => ({ time, value: 0.1 }),
  );
  assert.ok(Math.abs(layoutShiftScore(shifts) - 0.7) < 1e-10);
});

test("a session stops at five seconds even when shifts stay close", () => {
  const shifts = [100, 900, 1_700, 2_500, 3_300, 4_100, 4_900, 5_100].map(
    (time) => ({ time, value: 0.1 }),
  );
  assert.ok(Math.abs(layoutShiftScore(shifts) - 0.7) < 1e-10);
});

test("the score is the largest session rather than the lifetime sum", () => {
  assert.ok(
    Math.abs(
      layoutShiftScore([
        { time: 100, value: 0.1 },
        { time: 500, value: 0.2 },
        { time: 2_000, value: 0.1 },
        { time: 2_200, value: 0.1 },
      ]) - 0.3,
    ) < 1e-10,
  );
});

test("zero value entries do not start the scoring window", () => {
  const shifts = [
    { time: 100, value: 0 },
    ...[800, 1_600, 2_400, 3_200, 4_000, 4_800, 5_600].map((time) => ({
      time,
      value: 0.1,
    })),
  ];
  assert.ok(Math.abs(layoutShiftScore(shifts) - 0.7) < 1e-10);
});
