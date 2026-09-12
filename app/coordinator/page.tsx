import { Activity, Building2, Footprints, MapPinned, Trophy, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/coordinator/stat-tile";
import { RankedBarChart } from "@/components/coordinator/ranked-bar-chart";
import { AddLocationDialog } from "@/components/coordinator/add-location-dialog";
import { CreateOfficialChallengeDialog } from "@/components/coordinator/create-official-challenge-dialog";
import { AnnouncementDialog } from "@/components/coordinator/announcement-dialog";
import { formatNumber } from "@/lib/utils";

async function loadCoordinatorData(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: profile }, overviewRes, deptRes, routeRes, challengeRes] = await Promise.all([
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return { data: null };
      return supabase.from("profiles").select("role").eq("id", data.user.id).single();
    }),
    supabase.rpc("coordinator_overview"),
    supabase.rpc("coordinator_department_leaderboard"),
    supabase.rpc("coordinator_route_usage"),
    supabase.from("challenges").select("*").eq("is_official", true).gte("end_date", new Date().toISOString().slice(0, 10)).order("start_date").limit(1).maybeSingle(),
  ]);

  const isCoordinator = profile?.role === "coordinator";
  const overview = overviewRes.data?.[0] ?? null;
  const departments = deptRes.data ?? [];
  const routes = routeRes.data ?? [];
  const upcomingChallenge = challengeRes.data ?? null;

  return { isCoordinator, overview, departments, routes, upcomingChallenge };
}

export default async function CoordinatorPage() {
  const supabase = await createClient();

  let data: Awaited<ReturnType<typeof loadCoordinatorData>>;
  try {
    data = await loadCoordinatorData(supabase);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load the coordinator dashboard."} />;
  }
  const { isCoordinator, overview, departments, routes, upcomingChallenge } = data;

  if (!isCoordinator) {
    return <EmptyState icon={Building2} title="Coordinator access only" description="Sign in with a campus coordinator account to view this dashboard." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Campus overview</h1>
          <p className="text-sm text-muted-foreground">Anonymous, aggregated data only — no individual student details.</p>
        </div>
        <div className="flex gap-2">
          <AddLocationDialog />
          <AnnouncementDialog />
          <CreateOfficialChallengeDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Activity} label="Active students this week" value={overview ? formatNumber(overview.active_students_week) : "—"} />
        <StatTile icon={Footprints} label="Total campus steps" value={overview ? formatNumber(overview.total_campus_steps) : "—"} />
        <StatTile icon={Building2} label="Most active department" value={overview?.most_active_department ?? "—"} />
        <StatTile icon={MapPinned} label="Most popular route" value={overview?.most_popular_route ?? "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <EmptyState icon={Trophy} title="No activity logged yet" />
            ) : (
              <RankedBarChart data={departments} dataKey="total_steps" nameKey="department" unit="steps" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route usage (crowd check-ins)</CardTitle>
          </CardHeader>
          <CardContent>
            {routes.length === 0 || routes.every((r) => r.checkins === 0) ? (
              <EmptyState icon={MapPinned} title="No check-ins yet" />
            ) : (
              <RankedBarChart data={routes} dataKey="checkins" nameKey="route_name" unit="check-ins" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" /> Most active time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {overview?.most_active_hour != null ? `Around ${overview.most_active_hour}:00, based on the last 7 days of logged activity.` : "Not enough data yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming official challenge</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingChallenge ? (
            <div className="flex items-center gap-2">
              <Badge>Official</Badge>
              <p className="font-medium">{upcomingChallenge.title}</p>
              <p className="text-sm text-muted-foreground">ends {new Date(upcomingChallenge.end_date).toLocaleDateString()}</p>
            </div>
          ) : (
            <EmptyState icon={Trophy} title="No official challenge scheduled" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
