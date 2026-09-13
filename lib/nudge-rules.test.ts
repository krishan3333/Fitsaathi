import assert from "node:assert/strict";
import test from "node:test";
import { buildNudges, type NudgeContext } from "./nudge-rules.ts";
import type { FitWindow } from "./fit-window.ts";

function window(overrides: Partial<FitWindow> = {}): FitWindow {
  return {
    day: "Sun",
    start: "17:30",
    end: "18:00",
    minutes: 30,
    status: "green",
    aqi: 80,
    friends: [],
    indoorAlternative: false,
    score: 60,
    ...overrides,
  };
}

const base: NudgeContext = {
  date: "2026-01-16",
  nowMinutes: 17 * 60 + 20, // 17:20
  hour: 17,
  windows: [],
  hourly: [],
  daysSinceActive: 0,
  circleProgress: null,
};

test("fit_window fires for a green window starting within the 15-minute lead time", () => {
  const nudges = buildNudges({ ...base, windows: [window({ start: "17:30" })] });
  assert.equal(nudges.length, 1);
  assert.equal(nudges[0].type, "quest");
  assert.equal(nudges[0].dedupeKey, "fit_window:2026-01-16:17:30");
});

test("fit_window does not fire once the window is more than 15 minutes out", () => {
  const nudges = buildNudges({ ...base, windows: [window({ start: "18:00" })] });
  assert.equal(nudges.filter((n) => n.type === "quest" && n.link?.includes("18:00")).length, 0);
});

test("a red window never produces a fit_window nudge, even within lead time", () => {
  const nudges = buildNudges({ ...base, windows: [window({ start: "17:30", status: "red" })] });
  assert.equal(nudges.length, 0);
});

test("dedupe keys are stable for the same window across calls", () => {
  const ctx = { ...base, windows: [window({ start: "17:30" })] };
  const a = buildNudges(ctx)[0].dedupeKey;
  const b = buildNudges(ctx)[0].dedupeKey;
  assert.equal(a, b);
});

test("rain_soon fires when rain is within 2h and a window ends before it hits", () => {
  const nudges = buildNudges({
    ...base,
    windows: [window({ start: "17:30", end: "18:30" })],
    hourly: [{ hour: 19, tempC: 26, isRainy: true, aqi: 80, status: "yellow" }],
  });
  assert.ok(nudges.some((n) => n.type === "weather"));
});

test("rain_soon does not fire when the rain is more than 2h out", () => {
  const nudges = buildNudges({
    ...base,
    windows: [window({ start: "17:30", end: "18:30" })],
    hourly: [{ hour: 20, tempC: 26, isRainy: true, aqi: 80, status: "yellow" }],
  });
  assert.ok(!nudges.some((n) => n.type === "weather"));
});

test("streak_rescue fires only from 09:00 onward with 2+ missed days", () => {
  assert.ok(buildNudges({ ...base, daysSinceActive: 2, hour: 9 }).some((n) => n.type === "streak"));
  assert.ok(!buildNudges({ ...base, daysSinceActive: 2, hour: 8, nowMinutes: 8 * 60 }).some((n) => n.type === "streak"));
  assert.ok(!buildNudges({ ...base, daysSinceActive: 1, hour: 12, nowMinutes: 12 * 60 }).some((n) => n.type === "streak"));
});

test("circle_close fires only within 2000 steps of the goal, not at or past it", () => {
  assert.ok(buildNudges({ ...base, circleProgress: { current: 8500, goal: 10000 } }).some((n) => n.type === "circle"));
  assert.ok(!buildNudges({ ...base, circleProgress: { current: 5000, goal: 10000 } }).some((n) => n.type === "circle"));
  assert.ok(!buildNudges({ ...base, circleProgress: { current: 10000, goal: 10000 } }).some((n) => n.type === "circle"));
});

test("a quiet context with no trigger yields nothing", () => {
  assert.equal(buildNudges(base).length, 0);
});
