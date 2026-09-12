import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { LiveWeatherCard } from "@/components/fitroute/live-weather-card";
import { FitRouteExplorer } from "@/components/fitroute/fitroute-explorer";
import { MapPinned } from "lucide-react";

async function loadFitRoute(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("college").eq("id", userId).single();
  if (profileError) throw profileError;
  if (!profile.college) return { locations: [], college: null };

  const { data: locations, error } = await supabase
    .from("campus_locations")
    .select("*")
    .eq("college", profile.college)
    .order("distance_km", { ascending: true });
  if (error) throw error;

  return { locations: locations ?? [], college: profile.college };
}

export default async function FitRoutePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadFitRoute>>;
  try {
    data = await loadFitRoute(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load FitRoute."} />;
  }
  const { locations, college } = data;

  return (
    <div className="space-y-5 pb-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <MapPinned className="size-5 text-primary" /> FitRoute
      </h1>

      <LiveWeatherCard />

      <FitRouteExplorer curatedLocations={locations} college={college} />
    </div>
  );
}
