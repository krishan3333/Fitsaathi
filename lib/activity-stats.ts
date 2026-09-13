import type { Activity } from "./supabase/types";

export interface DayStat {
  date: string; // YYYY-MM-DD
  label: string; // "Mon"
  steps: number;
  activeMinutes: number;
  distanceKm: number;
}

/** Buckets activities into the last `days` calendar days (oldest first), local time. */
export function groupByDay(activities: Activity[], days = 7): DayStat[] {
  const today = new Date();
  const buckets: DayStat[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const date = d.toISOString().slice(0, 10);
    return { date, label: d.toLocaleDateString("en-US", { weekday: "short" }), steps: 0, activeMinutes: 0, distanceKm: 0 };
  });
  const byDate = new Map(buckets.map((b) => [b.date, b]));
  for (const a of activities) {
    const bucket = byDate.get(a.occurred_on);
    if (!bucket) continue;
    bucket.steps += a.steps;
    bucket.activeMinutes += a.active_minutes;
    bucket.distanceKm += a.distance_km;
  }
  return buckets;
}

export function activeDaysCount(activities: Activity[]) {
  return new Set(activities.filter((a) => a.steps > 0 || a.active_minutes > 0).map((a) => a.occurred_on)).size;
}

/** Days since the most recent activity in the given window, by IST calendar
 * date (not wall-clock hours) — 0 means "logged something today". A student
 * with nothing in the window at all has no streak to rescue (returns 0), so
 * their first quest isn't a guilt trip. Used by lib/quest-context.ts and
 * lib/nudge-rules.ts (streak_rescue). */
export function daysSinceLastActive(activities: Pick<Activity, "occurred_on">[], todayIsoDate: string): number {
  const lastActive = activities.reduce<string | null>((max, a) => (!max || a.occurred_on > max ? a.occurred_on : max), null);
  if (!lastActive) return 0;
  const diffDays = Math.floor((new Date(todayIsoDate).getTime() - new Date(lastActive).getTime()) / 86400000);
  return Math.max(0, diffDays);
}

export function personalRecords(activities: Activity[]) {
  const byDay = new Map<string, { steps: number; activeMinutes: number; distanceKm: number }>();
  for (const a of activities) {
    const cur = byDay.get(a.occurred_on) ?? { steps: 0, activeMinutes: 0, distanceKm: 0 };
    cur.steps += a.steps;
    cur.activeMinutes += a.active_minutes;
    cur.distanceKm += a.distance_km;
    byDay.set(a.occurred_on, cur);
  }
  const days = [...byDay.values()];
  const longestWalkKm = Math.max(0, ...activities.filter((a) => a.activity_type === "walk").map((a) => a.distance_km));
  const mostActiveDaySteps = Math.max(0, ...days.map((d) => d.steps));
  return { longestWalkKm, mostActiveDaySteps };
}
