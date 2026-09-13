// Pure engine: given today's Fit Windows and a bit of activity/circle
// context, decide which in-app nudges (if any) fire right now. No I/O — see
// lib/nudge-generator.ts for the caller (runs once per dashboard load, no
// background delivery) and lib/fit-window.ts for how the windows themselves
// are computed.
import type { FitWindow } from "./fit-window.ts";
import type { HourlyConditions } from "./weather";
import { describeWindow } from "./fit-window.ts";
import { formatSlotTime } from "./time.ts";

export type NudgeType = "quest" | "weather" | "streak" | "circle";

export interface Nudge {
  type: NudgeType;
  dedupeKey: string;
  title: string;
  body: string;
  link?: string;
}

export interface NudgeContext {
  date: string; // YYYY-MM-DD, IST — anchors dedupe keys to "today"
  nowMinutes: number; // IST, minutes since midnight
  hour: number; // IST hour, 0-23
  windows: FitWindow[]; // today's computed Fit Windows (lib/fit-window.ts)
  hourly: HourlyConditions[]; // today's forecast, for the rain_soon rule
  daysSinceActive: number;
  circleProgress: { current: number; goal: number } | null;
}

const LEAD_TIME_MINUTES = 15;
const RAIN_LOOKAHEAD_HOURS = 2;
const CIRCLE_CLOSE_STEPS = 2000;

function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fitWindowNudge(ctx: NudgeContext): Nudge | null {
  const upcoming = ctx.windows
    .filter((w) => w.status !== "red")
    .filter((w) => {
      const start = hhmmToMinutes(w.start);
      return start >= ctx.nowMinutes && start - ctx.nowMinutes <= LEAD_TIME_MINUTES;
    })
    .sort((a, b) => b.score - a.score)[0];
  if (!upcoming) return null;
  return {
    type: "quest",
    dedupeKey: `fit_window:${ctx.date}:${upcoming.start}`,
    title: "Free time coming up",
    body: describeWindow(upcoming),
    link: `/quest?window=${upcoming.start}-${upcoming.end}`,
  };
}

function rainSoonNudge(ctx: NudgeContext): Nudge | null {
  const rainyHour = ctx.hourly.find((h) => h.isRainy && h.hour >= ctx.hour && h.hour <= ctx.hour + RAIN_LOOKAHEAD_HOURS);
  if (!rainyHour) return null;
  const rainyStart = rainyHour.hour * 60;
  // An outdoor (non-red) window that wraps up before the rain hits — worth
  // moving up to now instead of waiting.
  const beatable = ctx.windows.find((w) => w.status !== "red" && hhmmToMinutes(w.end) <= rainyStart && hhmmToMinutes(w.start) >= ctx.nowMinutes);
  if (!beatable) return null;
  return {
    type: "weather",
    dedupeKey: `rain_soon:${ctx.date}:${rainyHour.hour}`,
    title: "Rain expected soon",
    body: `Rain looks likely around ${formatSlotTime(`${String(rainyHour.hour).padStart(2, "0")}:00`)} — you're free ${formatSlotTime(beatable.start)}–${formatSlotTime(beatable.end)} now, go before it starts.`,
    link: `/quest?window=${beatable.start}-${beatable.end}`,
  };
}

function streakRescueNudge(ctx: NudgeContext): Nudge | null {
  if (ctx.daysSinceActive < 2 || ctx.hour < 9) return null;
  return {
    type: "streak",
    dedupeKey: `streak_rescue:${ctx.date}`,
    title: "Missed a couple of days?",
    body: `It's been ${ctx.daysSinceActive} days since your last activity — a quick Streak Rescue quest gets you back on track.`,
    link: "/quest",
  };
}

function circleCloseNudge(ctx: NudgeContext): Nudge | null {
  const progress = ctx.circleProgress;
  if (!progress) return null;
  const remaining = progress.goal - progress.current;
  if (remaining <= 0 || remaining > CIRCLE_CLOSE_STEPS) return null;
  return {
    type: "circle",
    dedupeKey: `circle_close:${ctx.date}`,
    title: "So close to your circle's goal",
    body: `Your Fit Circle is only ${remaining.toLocaleString()} steps from today's goal — one more walk gets you there.`,
    link: "/",
  };
}

const RULES = [fitWindowNudge, rainSoonNudge, streakRescueNudge, circleCloseNudge];

export function buildNudges(ctx: NudgeContext): Nudge[] {
  return RULES.map((rule) => rule(ctx)).filter((n): n is Nudge => n != null);
}
