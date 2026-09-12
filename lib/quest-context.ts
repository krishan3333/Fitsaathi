// Shared "what should this student do right now" context: pulled together on
// both the dashboard (next quest) and the Quest page (full recommendations).
import type { createClient } from "./supabase/server";
import type { FreeSlot } from "./supabase/types";
import { fetchAqi, fetchWeather, getGreenWindow, type GreenWindow } from "./weather";
import { getCollegeCenter } from "./campus";
import type { QuestPlannerInput } from "./quest-engine";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function nextSlotToday(slots: FreeSlot[], now = new Date()) {
  const day = WEEKDAYS[now.getDay()];
  const hhmm = now.toTimeString().slice(0, 5);
  const upcoming = slots.filter((s) => s.day === day && s.end >= hhmm).sort((a, b) => a.start.localeCompare(b.start))[0];
  return upcoming ?? null;
}

export function timeDiffMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function formatSlotTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export async function buildQuestContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;

  // Counted server-side by an RPC so other students' timetables never leave the
  // database — see migration 0005_profile_privacy.sql.
  const { data: friendsCount } = await supabase.rpc("friends_available_now");
  const friendsAvailable = friendsCount ?? 0;

  // Based on the student's own college's campus, not a hardcoded default —
  // colleges differ, and a college with no FitRoute locations yet has no
  // sensible coordinate to check weather for.
  const collegeCenter = await getCollegeCenter(supabase, profile.college);
  const greenWindow: GreenWindow = collegeCenter
    ? getGreenWindow(...(await Promise.all([fetchWeather(collegeCenter.lat, collegeCenter.lng), fetchAqi(collegeCenter.lat, collegeCenter.lng)])))
    : { status: "green", message: "Weather data isn't available for your campus yet — ask your coordinator to add FitRoute locations." };

  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const { data: recentActivities } = await supabase.from("activities").select("occurred_on").eq("profile_id", userId).gte("occurred_on", sevenDaysAgo);
  const lastActive = (recentActivities ?? []).reduce<string | null>((max, a) => (!max || a.occurred_on > max ? a.occurred_on : max), null);
  // A brand-new student has no streak to rescue — only count missed days once
  // they've actually logged something, so their first quest isn't a guilt trip.
  const daysSinceActive = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000) : 0;

  const slotNow = nextSlotToday(profile.free_slots);

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

  return { profile, plannerInput, slotNow, greenWindow, friendsAvailable };
}
