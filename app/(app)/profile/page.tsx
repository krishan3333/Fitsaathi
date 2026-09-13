import Link from "next/link";
import { Award, Medal, Pencil, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityBarChart } from "@/components/dashboard/activity-bar-chart";
import { BadgesRow } from "@/components/dashboard/badges-row";
import { ActivityHistory } from "@/components/profile/activity-history";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { SettingsPanel } from "@/components/profile/settings-panel";
import { groupByDay, personalRecords } from "@/lib/activity-stats";
import { formatNumber } from "@/lib/utils";

async function loadProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);

  const [{ data: profile, error }, { data: monthActivities }, { data: badgeRows }, { data: myParticipations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("activities").select("*").eq("profile_id", userId).gte("occurred_on", thirtyDaysAgo).order("occurred_on", { ascending: false }),
    supabase.from("user_badges").select("earned_at, badges(name, icon)").eq("profile_id", userId).order("earned_at", { ascending: false }),
    supabase.from("challenge_participants").select("challenge_id, progress_value, challenges(id, title, type, goal_value, end_date, circle_id)").eq("profile_id", userId),
  ]);
  if (error) throw error;

  const activities = monthActivities ?? [];
  const weekActivities = activities.filter((a) => a.occurred_on >= sevenDaysAgo);
  const prevWeekActivities = activities.filter((a) => a.occurred_on >= fourteenDaysAgo && a.occurred_on < sevenDaysAgo);
  const thisWeekSteps = weekActivities.reduce((s, a) => s + a.steps, 0);
  const prevWeekSteps = prevWeekActivities.reduce((s, a) => s + a.steps, 0);
  const improvementPct = prevWeekSteps > 0 ? Math.round(((thisWeekSteps - prevWeekSteps) / prevWeekSteps) * 100) : thisWeekSteps > 0 ? 100 : 0;

  const badges = (badgeRows ?? []).map((b) => b.badges as unknown as { name: string; icon: string }).filter(Boolean);
  const records = personalRecords(activities);

  const ended = (myParticipations ?? [])
    .map((p) => ({ ...p, challenge: p.challenges as unknown as { id: string; title: string; type: string; goal_value: number; end_date: string; circle_id: string | null } }))
    .filter((p) => p.challenge && p.challenge.end_date < new Date().toISOString().slice(0, 10));
  const TEAM_TYPES = new Set(["team_steps", "department_vs_department", "hostel_vs_hostel"]);
  const wins = ended.filter((p) => (TEAM_TYPES.has(p.challenge.type) ? true : Number(p.progress_value) >= Number(p.challenge.goal_value)));

  return { profile, activities, dayStatsWeek: groupByDay(activities, 7), dayStatsMonth: groupByDay(activities, 30), badges, records, improvementPct, wins };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadProfile>>;
  try {
    data = await loadProfile(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load your profile."} />;
  }
  const { profile, activities, dayStatsWeek, dayStatsMonth, badges, records, improvementPct, wins } = data;

  return (
    <div className="space-y-5 pb-4">
      <Card className="shadow-lift">
        <CardContent className="flex items-center gap-4 py-5">
          <AvatarUpload userId={user.id} name={profile.name} avatarUrl={profile.avatar_url} />
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[1.35rem] leading-tight">{profile.name}</h1>
            {(profile.college || profile.department || profile.account_type === "student") && (
              <p className="mt-0.5 truncate text-[0.82rem] text-muted-foreground">
                {[profile.college, profile.department].filter(Boolean).join(" · ") || "Add your campus details"}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.fitness_goal && <Badge variant="muted">{profile.fitness_goal}</Badge>}
              <Badge variant="default">{profile.level}</Badge>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile/edit">
              <Pencil /> Edit
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="px-4 py-4">
            <TrendingUp className="mb-2 size-4 text-accent-green" />
            <p className="metric-sm text-accent-green text-[1.35rem]">{improvementPct > 0 ? "+" : ""}{improvementPct}<span className="text-[0.85rem] font-medium text-muted-foreground">%</span></p>
            <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">vs last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-4">
            <Medal className="mb-2 size-4 text-accent-orange" />
            <p className="metric-sm text-accent-orange text-[1.35rem]">{wins.length}</p>
            <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">Challenge wins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-4">
            <Award className="mb-2 size-4 text-accent-pink" />
            <p className="metric-sm text-accent-pink text-[1.35rem]">{badges.length}</p>
            <p className="mt-0.5 text-[0.7rem] leading-tight text-muted-foreground">Badges</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity graph</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="week">
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
            <TabsContent value="week">
              <ActivityBarChart data={dayStatsWeek} />
            </TabsContent>
            <TabsContent value="month">
              <ActivityBarChart data={dayStatsMonth} height={200} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal records</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold">{records.longestWalkKm.toFixed(1)} km</p>
            <p className="text-xs text-muted-foreground">Longest walk</p>
          </div>
          <div>
            <p className="text-lg font-bold">{formatNumber(records.mostActiveDaySteps)}</p>
            <p className="text-xs text-muted-foreground">Most active day</p>
          </div>
          <div>
            <p className="text-lg font-bold">{profile.longest_streak} days</p>
            <p className="text-xs text-muted-foreground">Best streak</p>
          </div>
        </CardContent>
      </Card>

      <BadgesRow badges={badges} />

      {wins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Challenge wins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wins.map((w) => (
              <div key={w.challenge.id} className="flex items-center gap-2 text-sm">
                <Medal className="size-4 text-warning" /> {w.challenge.title}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ActivityHistory activities={activities.slice(0, 15)} />

      <SettingsPanel profile={profile} />

      <SignOutButton />
    </div>
  );
}
