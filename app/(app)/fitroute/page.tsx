import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ErrorState } from "@/components/ui/empty-state";
import { LiveWeatherCard } from "@/components/fitroute/live-weather-card";
import { FitRouteExplorer } from "@/components/fitroute/fitroute-explorer";

async function loadFitRoute(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("college").eq("id", userId).single();
  if (profileError) throw profileError;
  if (!profile.college) return { locations: [], college: null, ratings: {} };

  const [{ data: locations, error }, { data: ratingRows }] = await Promise.all([
    supabase.from("campus_locations").select("*").eq("college", profile.college).order("distance_km", { ascending: true }),
    supabase.from("facility_ratings").select("*"),
  ]);
  if (error) throw error;

  const ratings = Object.fromEntries((ratingRows ?? []).map((r) => [r.location_id, r]));
  return { locations: locations ?? [], college: profile.college, ratings };
}

export default async function FitRoutePage() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadFitRoute>>;
  try {
    data = await loadFitRoute(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load FitRoute."} />;
  }
  const { locations, college, ratings } = data;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="display text-[1.6rem] leading-none">FitRoute</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          Where to move on campus right now, based on live conditions and how busy each spot is.
        </p>
      </div>

      <LiveWeatherCard />

      <FitRouteExplorer curatedLocations={locations} college={college} ratings={ratings} />
    </div>
  );
}
