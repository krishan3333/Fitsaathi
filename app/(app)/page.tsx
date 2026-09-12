import { createClient } from "@/lib/supabase/server";
import { buildQuestContext, formatSlotTime } from "@/lib/quest-context";
import { recommendQuests } from "@/lib/quest-engine";
import { groupByDay, activeDaysCount } from "@/lib/activity-stats";
import { ErrorState } from "@/components/ui/empty-state";
import { GreetingHeader } from "@/components/dashboard/greeting-header";
import { StepProgressCard } from "@/components/dashboard/step-progress-card";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { BadgesRow } from "@/components/dashboard/badges-row";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { NextQuestCard } from "@/components/dashboard/next-quest-card";
import { FitRouteStatusCard } from "@/components/dashboard/fitroute-status-card";
import { FitCircleCard } from "@/components/dashboard/fit-circle-card";
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

  const { profile, stepsToday, minutesToday, activeDays, dayStats, badges, fitCircle, topQuest, slotNow, greenWindow, nearbyLocation } = data;

  return (
    <div className="space-y-5 pb-4">
      <GreetingHeader name={profile.name} streak={profile.current_streak} />
      <StepProgressCard steps={stepsToday} activeMinutes={minutesToday} activeDays={activeDays} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This week</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityBarChart data={dayStats} />
        </CardContent>
      </Card>

      <BadgesRow badges={badges} />
      <QuickActions />
      <NextQuestCard quest={topQuest?.quest ?? null} time={slotNow ? formatSlotTime(slotNow.start) : "Anytime today"} />
      <FitRouteStatusCard status={greenWindow.status} bestNearby={nearbyLocation ? { name: nearbyLocation.name, distanceKm: Number(nearbyLocation.distance_km) } : null} />
      <FitCircleCard circle={fitCircle} />
    </div>
  );
}

async function loadDashboard(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [{ profile, plannerInput, slotNow, greenWindow }, weekActivitiesRes, badgesRes, circleMembershipRes, questsRes] = await Promise.all([
    buildQuestContext(supabase, userId),
    supabase.from("activities").select("*").eq("profile_id", userId).gte("occurred_on", sevenDaysAgo),
    supabase.from("user_badges").select("earned_at, badges(name, icon)").eq("profile_id", userId).order("earned_at", { ascending: false }).limit(5),
    supabase.from("circle_members").select("circle_id, fit_circles(id, name)").eq("profile_id", userId).limit(1).maybeSingle(),
    supabase.from("quests").select("*"),
  ]);

  const weekActivities = weekActivitiesRes.data ?? [];
  const todayActivities = weekActivities.filter((a) => a.occurred_on === today);
  const stepsToday = todayActivities.reduce((s, a) => s + a.steps, 0);
  const minutesToday = todayActivities.reduce((s, a) => s + a.active_minutes, 0);
  const activeDays = activeDaysCount(weekActivities);
  const dayStats = groupByDay(weekActivities, 7);
  const badges = (badgesRes.data ?? []).map((b) => b.badges as unknown as { name: string; icon: string }).filter(Boolean);

  // Fit Circle: first circle the student belongs to + its team-steps challenge.
  let fitCircle = null;
  const circleId = circleMembershipRes.data?.circle_id;
  if (circleId) {
    const circleName = (circleMembershipRes.data!.fit_circles as unknown as { name: string })?.name ?? "Fit Circle";
    const { data: challenge } = await supabase
      .from("challenges")
      .select("id, goal_value")
      .eq("circle_id", circleId)
      .eq("type", "team_steps")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (challenge) {
      const { data: participants } = await supabase.from("challenge_participants").select("progress_value").eq("challenge_id", challenge.id);
      const current = (participants ?? []).reduce((s, p) => s + Number(p.progress_value), 0);
      fitCircle = { name: circleName, current, goal: Number(challenge.goal_value), challengeId: challenge.id };
    }
  }

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

  return { profile, stepsToday, minutesToday, activeDays, dayStats, badges, fitCircle, topQuest, slotNow, greenWindow, nearbyLocation };
}
