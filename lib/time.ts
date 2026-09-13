// Students enter free_slots in IST; the server (Vercel, Supabase) runs in UTC.
// Every place that compares "now" against a slot must go through here instead
// of `new Date()` / `toTimeString()` directly, or it silently drifts by 5h30
// once deployed. See migration 0018_notification_fixes.sql for the SQL-side
// equivalent (`now() at time zone 'Asia/Kolkata'`).
export const APP_TZ = "Asia/Kolkata";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ, weekday: "short" });
const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface LocalClock {
  day: string; // "Mon".."Sun"
  date: string; // YYYY-MM-DD in IST
  hhmm: string; // "17:30"
  minutes: number; // minutes since midnight IST
  hour: number;
}

export function localClock(now = new Date()): LocalClock {
  const day = WEEKDAY_FORMATTER.format(now);
  const hhmm = TIME_FORMATTER.format(now);
  const [hour, minute] = hhmm.split(":").map(Number);
  // en-CA gives YYYY-MM-DD directly.
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(now);
  return { day, date, hhmm, minutes: hour * 60 + minute, hour };
}

export function timeDiffMinutes(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function hhmmToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatSlotTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
