import assert from "node:assert/strict";
import test from "node:test";
import { computeFitWindows, bestFitWindow, describeWindow } from "./fit-window.ts";
import { localClock } from "./time.ts";
import type { FreeSlot } from "./supabase/types.ts";
import type { HourlyConditions } from "./weather.ts";

function hourly(entries: Array<Partial<HourlyConditions> & { hour: number }>): HourlyConditions[] {
  return entries.map((e) => ({ tempC: 25, isRainy: false, aqi: 80, status: "green", ...e }));
}

const slots: FreeSlot[] = [{ day: "Sun", start: "17:00", end: "19:00" }];

test("splits a slot into red/green segments at the hour boundary", () => {
  const windows = computeFitWindows({
    slots,
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([
      { hour: 17, status: "green", aqi: 70 },
      { hour: 18, status: "red", aqi: 180 },
    ]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  assert.equal(windows.length, 2);
  assert.deepEqual(
    windows.map((w) => [w.start, w.end, w.status]),
    [
      ["17:00", "18:00", "green"],
      ["18:00", "19:00", "red"],
    ]
  );
  assert.equal(windows[1].indoorAlternative, true);
});

test("merges consecutive equal-status hours into one window", () => {
  const windows = computeFitWindows({
    slots,
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([
      { hour: 17, status: "green" },
      { hour: 18, status: "green" },
    ]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  assert.equal(windows.length, 1);
  assert.deepEqual([windows[0].start, windows[0].end], ["17:00", "19:00"]);
});

test("drops segments shorter than minMinutes", () => {
  const windows = computeFitWindows({
    slots: [{ day: "Sun", start: "17:00", end: "17:05" }],
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([{ hour: 17 }]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
    minMinutes: 10,
  });
  assert.equal(windows.length, 0);
});

test("an hour missing from the forecast is treated as yellow, not an outage", () => {
  const windows = computeFitWindows({
    slots: [{ day: "Sun", start: "17:00", end: "18:00" }],
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: [],
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].status, "yellow");
  assert.equal(windows[0].aqi, null);
});

test("a slot that has already ended is skipped entirely", () => {
  const windows = computeFitWindows({
    slots: [{ day: "Sun", start: "10:00", end: "11:00" }],
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([{ hour: 10 }]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  assert.equal(windows.length, 0);
});

test("a slot already in progress is clipped to start now, not its original start", () => {
  const windows = computeFitWindows({
    slots: [{ day: "Sun", start: "16:00", end: "18:00" }],
    day: "Sun",
    nowMinutes: 17 * 60 + 30,
    hourly: hourly([{ hour: 16 }, { hour: 17 }]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].start, "17:30");
});

test("friends attach to every segment carved from their slot, and boost score", () => {
  const windows = computeFitWindows({
    slots,
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([{ hour: 17 }, { hour: 18 }]),
    friendsBySlot: { "17:00-19:00": ["Aditi", "Imran"] },
    indoorOutdoorPref: "Both",
  });
  assert.deepEqual(windows[0].friends, ["Aditi", "Imran"]);
  assert.equal(windows[0].score, 60 + 40 + 30); // 2h capped at 60 + 2*20 friends + green 30
});

test("bestFitWindow picks the highest score, earliest start breaks ties", () => {
  const windows = computeFitWindows({
    slots: [
      { day: "Sun", start: "17:00", end: "17:30" },
      { day: "Sun", start: "19:00", end: "19:30" },
    ],
    day: "Sun",
    nowMinutes: 16 * 60,
    hourly: hourly([{ hour: 17, status: "green" }, { hour: 19, status: "green" }]),
    friendsBySlot: {},
    indoorOutdoorPref: "Both",
  });
  const best = bestFitWindow(windows);
  assert.equal(best?.start, "17:00");
});

test("bestFitWindow on no windows returns null", () => {
  assert.equal(bestFitWindow([]), null);
});

test("describeWindow formats time, AQI, and friend names", () => {
  const [window] = computeFitWindows({
    slots,
    day: "Sun",
    nowMinutes: 17 * 60,
    hourly: hourly([{ hour: 17, status: "green", aqi: 78 }, { hour: 18, status: "green", aqi: 78 }]),
    friendsBySlot: { "17:00-19:00": ["Aditi", "Imran"] },
    indoorOutdoorPref: "Both",
  });
  assert.equal(describeWindow(window), "You're free 5:00 PM–7:00 PM, AQI 78, Aditi & Imran are free.");
});

test("localClock reads IST wall-clock off a fixed UTC instant", () => {
  // 2026-01-15T20:00:00Z is 2026-01-16 01:30 IST (UTC+5:30) — crosses midnight
  // into the next day, the case that breaks a naive server-local read.
  const clock = localClock(new Date("2026-01-15T20:00:00Z"));
  assert.equal(clock.date, "2026-01-16");
  assert.equal(clock.hhmm, "01:30");
  assert.equal(clock.day, "Fri");
  assert.equal(clock.minutes, 90);
});
