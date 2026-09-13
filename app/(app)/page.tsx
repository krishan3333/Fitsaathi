import { createClient } from "@/lib/supabase/server";
import { buildQuestContext, formatSlotTime } from "@/lib/quest-context";
import { recommendQuests } from "@/lib/quest-engine";
import { groupByDay, activeDaysCount } from "@/lib/activity-stats";
import { loadFitCircle } from "@/lib/fit-circle";
import { generateInAppNudges } from "@/lib/nudge-generator";
import { ErrorState } from "@/components/ui/empty-state";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { StepProgressCard } from "@/components/dashboard/step-progress-card";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { BadgesRow } from "@/components/dashboard/badges-row";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { NextQuestCard } from "@/components/dashboard/next-quest-card";
import { FitRouteStatusCard } from "@/components/dashboard/fitroute-status-card";
import { FitCircleCard } from "@/components/dashboard/fit-circle-card";
import { FitWindowsCard } from "@/components/dashboard/fit-windows-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // layout already redirects; satisfies TS

  let data: Awaited<ReturnType<typeof loadDashboard>>;
  try {
    data = await loadDashboard(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load your dashboard."} />;
  }

  const { profile, stepsToday, minutesToday, activeDays, dayStats, badges, fitCircle, topQuest, slotNow, greenWindow, nearbyLocation, fitWindows } = data;

  return (
    <div className="space-y-6 pb-4">
      <GreetingHeader name={profile.name} streak={profile.current_streak} />

      {/* Where you are → when you're free → what to do, then the supporting
          detail. On wide screens the narrative column stays readable instead
          of stretching a single stack across the full width. */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <StepProgressCard steps={stepsToday} activeMinutes={minutesToday} activeDays={activeDays} />
          <FitWindowsCard windows={fitWindows} />
          <NextQuestCard quest={topQuest?.quest ?? null} time={slotNow ? formatSlotTime(slotNow.start) : "Anytime today"} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <QuickActions />

          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityBarChart data={dayStats} />
            </CardContent>
          </Card>

          <FitRouteStatusCard status={greenWindow.status} bestNearby={nearbyLocation ? { name: nearbyLocation.name, distanceKm: Number(nearbyLocation.distance_km) } : null} />
          <FitCircleCard circle={fitCircle} />
          <BadgesRow badges={badges} />
        </div>
      </div>
    </div>
  );
}

async function loadDashboard(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [{ profile, plannerInput, slotNow, greenWindow, fitWindows, hourly, daysSinceActive }, weekActivitiesRes, badgesRes, fitCircle, questsRes] = await Promise.all([
    buildQuestContext(supabase, userId),
    supabase.from("activities").select("*").eq("profile_id", userId).gte("occurred_on", sevenDaysAgo),
    supabase.from("user_badges").select("earned_at, badges(name, icon)").eq("profile_id", userId).order("earned_at", { ascending: false }).limit(5),
    loadFitCircle(supabase, userId),
    supabase.from("quests").select("*"),
  ]);

  // In-app only: this is the one moment a nudge can ever appear, since there's
  // no background push — a student who never opens the dashboard never gets
  // one. nudge_log's unique constraint means re-opening the dashboard later
  // today is a no-op, not a duplicate notification.
  if (profile.notifications_enabled) {
    await generateInAppNudges(supabase, userId, {
      fitWindows,
      hourly,
      daysSinceActive,
      circleProgress: fitCircle ? { current: fitCircle.current, goal: fitCircle.goal } : null,
    });
  }

  const weekActivities = weekActivitiesRes.data ?? [];
  const todayActivities = weekActivities.filter((a) => a.occurred_on === today);
  const stepsToday = todayActivities.reduce((s, a) => s + a.steps, 0);
  const minutesToday = todayActivities.reduce((s, a) => s + a.active_minutes, 0);
  const activeDays = activeDaysCount(weekActivities);
  const dayStats = groupByDay(weekActivities, 7);
  const badges = (badgesRes.data ?? []).map((b) => b.badges as unknown as { name: string; icon: string }).filter(Boolean);

  const { data: nearbyLocation } = profile.college
    ? await supabase
        .from("campus_locations")
        .select("name, distance_km")
        .eq("college", profile.college)
        .eq("is_open", true)
        .order("distance_km", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const [topQuest] = recommendQuests(questsRes.data ?? [], plannerInput, 1);

  return { profile, stepsToday, minutesToday, activeDays, dayStats, badges, fitCircle, topQuest, slotNow, greenWindow, nearbyLocation, fitWindows };
}
