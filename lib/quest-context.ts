// Shared "what should this student do right now" context: pulled together on
// both the dashboard (next quest) and the Quest page (full recommendations).
import type { createClient } from "./supabase/server";
import type { FreeSlot } from "./supabase/types";
import { fetchAqi, fetchWeather, fetchHourlyForecast, getGreenWindow, type GreenWindow, type HourlyConditions } from "./weather";
import { getCollegeCenter } from "./campus";
import type { QuestPlannerInput } from "./quest-engine";
import { localClock, timeDiffMinutes, formatSlotTime } from "./time.ts";
import { computeFitWindows, bestFitWindow, type FitWindow } from "./fit-window.ts";
import { daysSinceLastActive } from "./activity-stats";

// Re-exported so existing imports (app/(app)/page.tsx) keep working — the
// canonical implementations moved to lib/time.ts so lib/fit-window.ts can
// use them too without importing this module (which imports fit-window).
export { timeDiffMinutes, formatSlotTime };

export function nextSlotToday(slots: FreeSlot[], now = new Date()) {
  const { day, hhmm } = localClock(now);
  const upcoming = slots.filter((s) => s.day === day && s.end >= hhmm).sort((a, b) => a.start.localeCompare(b.start))[0];
  return upcoming ?? null;
}

export async function buildQuestContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;

  // Counted server-side by an RPC so other students' timetables never leave the
  // database — see migration 0005_profile_privacy.sql / 0018.
  const { data: friendsCount } = await supabase.rpc("friends_available_now");
  const friendsAvailable = friendsCount ?? 0;

  // Based on the student's own college's campus, not a hardcoded default —
  // colleges differ, and a college with no FitRoute locations yet has no
  // sensible coordinate to check weather for.
  const collegeCenter = await getCollegeCenter(supabase, profile.college);
  const now = localClock();
  let greenWindow: GreenWindow = { status: "green", message: "Weather data isn't available for your campus yet — ask your coordinator to add FitRoute locations." };
  let hourly: HourlyConditions[] = [];
  if (collegeCenter) {
    const [weather, aqi, hourlyForecast] = await Promise.all([
      fetchWeather(collegeCenter.lat, collegeCenter.lng),
      fetchAqi(collegeCenter.lat, collegeCenter.lng),
      fetchHourlyForecast(collegeCenter.lat, collegeCenter.lng).catch(() => [] as HourlyConditions[]),
    ]);
    greenWindow = getGreenWindow(weather, aqi);
    hourly = hourlyForecast;
  }

  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const { data: recentActivities } = await supabase.from("activities").select("occurred_on").eq("profile_id", userId).gte("occurred_on", sevenDaysAgo);
  const daysSinceActive = daysSinceLastActive(recentActivities ?? [], now.date);

  const slotNow = nextSlotToday(profile.free_slots);

  // Per-slot friend availability, privacy-safe (0019_fit_windows.sql) — used
  // only to build today's Fit Windows, never exposes anyone's timetable.
  const { data: friendSlots } = await supabase.rpc("friends_free_for_slots", { p_day: now.day });
  const friendsBySlot: Record<string, string[]> = {};
  for (const row of friendSlots ?? []) {
    friendsBySlot[`${row.slot_start}-${row.slot_end}`] = row.friend_names ?? [];
  }

  const fitWindows: FitWindow[] = computeFitWindows({
    slots: profile.free_slots,
    day: now.day,
    nowMinutes: now.minutes,
    hourly,
    friendsBySlot,
    indoorOutdoorPref: profile.indoor_outdoor,
  });
  const bestWindow = bestFitWindow(fitWindows);

  const plannerInput: QuestPlannerInput = {
    goal: profile.fitness_goal,
    level: profile.fitness_level,
    freeMinutes: slotNow ? timeDiffMinutes(slotNow.start, slotNow.end) : profile.preferred_duration ?? 15,
    indoorOutdoorPref: profile.indoor_outdoor,
    greenWindow: greenWindow.status,
    friendsAvailable,
    daysSinceActive,
    lowImpact: profile.low_impact,
    accountType: profile.account_type,
  };

  return { profile, plannerInput, slotNow, greenWindow, friendsAvailable, fitWindows, bestWindow, hourly, daysSinceActive };
}
