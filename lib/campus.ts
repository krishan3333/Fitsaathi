import type { createClient } from "./supabase/server";

/** Average coordinate of a college's own FitRoute pins — used as a sensible
 * weather/AQI reference point for that college. Returns null if nobody has
 * added any locations for this college yet (brand new campus). */
export async function getCollegeCenter(supabase: Awaited<ReturnType<typeof createClient>>, college: string | null) {
  if (!college) return null;
  const { data } = await supabase.from("campus_locations").select("lat, lng").eq("college", college);
  if (!data || data.length === 0) return null;
  const lat = data.reduce((sum, d) => sum + d.lat, 0) / data.length;
  const lng = data.reduce((sum, d) => sum + d.lng, 0) / data.length;
  return { lat, lng };
}
