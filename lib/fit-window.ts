// Pure engine: which of today's free slots are actually a good time to be
// active, given the hour-by-hour weather/AQI forecast and which circle-mates
// are free at the same time. Same style as lib/quest-engine.ts — no I/O,
// fully unit tested (see fit-window.test.ts). Consumed by lib/quest-context.ts
// (dashboard/quest page) and lib/nudge-generator.ts (in-app nudges).
import type { FreeSlot, IndoorOutdoor } from "./supabase/types";
import type { GreenWindowStatus, HourlyConditions } from "./weather";
import { hhmmToMinutes, minutesToHhmm, formatSlotTime } from "./time.ts";

export interface FitWindow {
  day: string;
  start: string; // "HH:MM"
  end: string;
  minutes: number;
  status: GreenWindowStatus;
  aqi: number | null;
  friends: string[];
  indoorAlternative: boolean; // status is red — suggest an indoor quest instead
  score: number;
}

export interface ComputeFitWindowsInput {
  slots: FreeSlot[]; // the student's full free_slots list (all days)
  day: string; // today's day label, e.g. "Mon" — only slots on this day are considered
  nowMinutes: number; // current IST time, minutes since midnight
  hourly: HourlyConditions[]; // today's forecast; missing/empty → every segment is yellow
  friendsBySlot: Record<string, string[]>; // key: `${start}-${end}`, matching a raw slot
  indoorOutdoorPref: IndoorOutdoor;
  minMinutes?: number;
}

interface RawSegment {
  startMin: number;
  endMin: number;
  status: GreenWindowStatus;
  aqi: number | null;
}

function statusForHour(hourly: HourlyConditions[], hour: number): { status: GreenWindowStatus; aqi: number | null } {
  const match = hourly.find((h) => h.hour === hour);
  if (!match) return { status: "yellow", aqi: null };
  return { status: match.status, aqi: match.aqi };
}

/** Splits [startMin, endMin) into one raw segment per hour boundary it
 * crosses, each labelled from the forecast for that hour. */
function segmentByHour(startMin: number, endMin: number, hourly: HourlyConditions[]): RawSegment[] {
  const segments: RawSegment[] = [];
  let cursor = startMin;
  while (cursor < endMin) {
    const hour = Math.floor(cursor / 60);
    const nextHourBoundary = (hour + 1) * 60;
    const segEnd = Math.min(endMin, nextHourBoundary);
    const { status, aqi } = statusForHour(hourly, hour);
    segments.push({ startMin: cursor, endMin: segEnd, status, aqi });
    cursor = segEnd;
  }
  return segments;
}

/** Merges consecutive same-status segments so a 3-hour green slot doesn't
 * render (or score) as three separate windows. */
function mergeSegments(segments: RawSegment[]): RawSegment[] {
  const merged: RawSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.status === seg.status) {
      last.endMin = seg.endMin;
      // Keep the AQI reading closest to the segment's start for description purposes.
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

function scoreWindow(minutes: number, friendCount: number, status: GreenWindowStatus): number {
  const statusScore = status === "green" ? 30 : status === "yellow" ? 10 : 0;
  return Math.min(minutes, 60) + friendCount * 20 + statusScore;
}

export function computeFitWindows(input: ComputeFitWindowsInput): FitWindow[] {
  const { slots, day, nowMinutes, hourly, friendsBySlot, minMinutes = 10 } = input;
  const windows: FitWindow[] = [];

  for (const slot of slots.filter((s) => s.day === day)) {
    const slotStart = hhmmToMinutes(slot.start);
    const slotEnd = hhmmToMinutes(slot.end);
    if (slotEnd <= nowMinutes) continue; // already fully elapsed today

    const effectiveStart = Math.max(slotStart, nowMinutes);
    if (effectiveStart >= slotEnd) continue;

    const friends = friendsBySlot[`${slot.start}-${slot.end}`] ?? [];
    const raw = mergeSegments(segmentByHour(effectiveStart, slotEnd, hourly));

    for (const seg of raw) {
      const minutes = seg.endMin - seg.startMin;
      if (minutes < minMinutes) continue;
      windows.push({
        day,
        start: minutesToHhmm(seg.startMin),
        end: minutesToHhmm(seg.endMin),
        minutes,
        status: seg.status,
        aqi: seg.aqi,
        friends,
        indoorAlternative: seg.status === "red",
        score: scoreWindow(minutes, friends.length, seg.status),
      });
    }
  }

  return windows.sort((a, b) => hhmmToMinutes(a.start) - hhmmToMinutes(b.start));
}

/** Highest-scoring window, ties broken by whichever starts soonest. */
export function bestFitWindow(windows: FitWindow[]): FitWindow | null {
  if (windows.length === 0) return null;
  return [...windows].sort((a, b) => b.score - a.score || hhmmToMinutes(a.start) - hhmmToMinutes(b.start))[0];
}

export function describeWindow(window: FitWindow): string {
  const parts = [`You're free ${formatSlotTime(window.start)}–${formatSlotTime(window.end)}`];
  if (window.aqi != null) parts.push(`AQI ${window.aqi}`);
  if (window.friends.length === 1) parts.push(`${window.friends[0]} is free too`);
  else if (window.friends.length === 2) parts.push(`${window.friends[0]} & ${window.friends[1]} are free`);
  else if (window.friends.length > 2) parts.push(`${window.friends[0]} & ${window.friends.length - 1} others are free`);
  return parts.join(", ") + ".";
}
