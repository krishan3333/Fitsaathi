import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaderboardTabs, type LeaderboardRow } from "@/components/leaderboard/leaderboard-tabs";
import { RealtimeRefresher } from "@/components/leaderboard/realtime-refresher";
import { formatNumber } from "@/lib/utils";

type ParticipantProfile = {
  id: string;
  name: string;
  nickname: string | null;
  use_nickname: boolean;
  hide_steps: boolean;
  current_streak: number;
  avatar_url: string | null;
};

function displayName(p: ParticipantProfile) {
  return p.use_nickname && p.nickname ? p.nickname : p.name;
}

async function loadChallenge(supabase: Awaited<ReturnType<typeof createClient>>, challengeId: string, userId: string) {
  const { data: challenge, error } = await supabase.from("challenges").select("*").eq("id", challengeId).maybeSingle();
  if (error) throw error;
  if (!challenge) return null;

  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("profile_id, progress_value, group_label")
    .eq("challenge_id", challengeId);

  // Other students' details come from the curated public view, never the full
  // profiles table (migration 0005).
  const participantIds = (participants ?? []).map((p) => p.profile_id);
  const { data: publicProfiles } = participantIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, name, nickname, use_nickname, hide_steps, current_streak, avatar_url")
        .in("id", participantIds)
    : { data: [] };
  const profileById = new Map((publicProfiles ?? []).map((p) => [p.id, p as ParticipantProfile]));

  const rows = (participants ?? [])
    .map((p) => ({
      progress: Number(p.progress_value),
      groupLabel: p.group_label,
      profile: profileById.get(p.profile_id) as ParticipantProfile,
    }))
    .filter((r) => r.profile);

  const totalActivity: LeaderboardRow[] = rows
    .filter((r) => r.profile)
    .sort((a, b) => b.progress - a.progress)
    .map((r) => ({
      profileId: r.profile.id,
      name: r.profile.hide_steps && r.profile.id !== userId ? `${displayName(r.profile)} (hidden)` : displayName(r.profile),
      value: r.profile.hide_steps && r.profile.id !== userId ? 0 : r.progress,
      streak: r.profile.current_streak,
      isSelf: r.profile.id === userId,
      avatarUrl: r.profile.avatar_url,
    }));

  // Improvement League: current challenge-window metric vs an equal-length prior
  // window, comparing whichever field this challenge type actually tracks —
  // not always steps.
  const showImprovement = challenge.type !== "active_streak";
  let improvement: LeaderboardRow[] = [];

  if (showImprovement) {
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    const spanMs = end.getTime() - start.getTime() || 86400000;
    const prevStart = new Date(start.getTime() - spanMs).toISOString().slice(0, 10);
    const prevEnd = new Date(start.getTime() - 1).toISOString().slice(0, 10);
    const profileIds = rows.map((r) => r.profile?.id).filter(Boolean);

    const metricOf = (a: { steps: number; distance_km: number; active_minutes: number; activity_type: string }) => {
      switch (challenge.type) {
        case "walking_distance":
          return a.activity_type === "walk" ? a.distance_km : 0;
        case "running_distance":
          return a.activity_type === "run" ? a.distance_km : 0;
        case "cycling_distance":
          return a.activity_type === "cycle" ? a.distance_km : 0;
        case "workout_minutes":
          return a.active_minutes;
        default:
          return a.steps;
      }
    };

    const { data: prevActivities } = profileIds.length
      ? await supabase
          .from("activities")
          .select("profile_id, steps, distance_km, active_minutes, activity_type")
          .in("profile_id", profileIds)
          .gte("occurred_on", prevStart)
          .lte("occurred_on", prevEnd)
      : { data: [] };
    const prevTotals = new Map<string, number>();
    for (const a of prevActivities ?? []) prevTotals.set(a.profile_id, (prevTotals.get(a.profile_id) ?? 0) + metricOf(a));

    const { data: currentActivities } = profileIds.length
      ? await supabase
          .from("activities")
          .select("profile_id, steps, distance_km, active_minutes, activity_type")
          .in("profile_id", profileIds)
          .gte("occurred_on", challenge.start_date)
          .lte("occurred_on", challenge.end_date)
      : { data: [] };
    const currentTotals = new Map<string, number>();
    for (const a of currentActivities ?? []) currentTotals.set(a.profile_id, (currentTotals.get(a.profile_id) ?? 0) + metricOf(a));

    improvement = rows
      .filter((r) => r.profile)
      .map((r) => {
        const prev = prevTotals.get(r.profile.id) ?? 0;
        const current = currentTotals.get(r.profile.id) ?? 0;
        const pct = prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;
        return {
          profileId: r.profile.id,
          name: displayName(r.profile),
          value: pct,
          isSelf: r.profile.id === userId,
          avatarUrl: r.profile.avatar_url,
        };
      })
      .sort((a, b) => b.value - a.value);
  }

  const isJoined = rows.some((r) => r.profile?.id === userId);

  return { challenge, totalActivity, improvement, showImprovement, isJoined };
}

export default async function ChallengeDetailPage({ params }: PageProps<"/challenges/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadChallenge>>;
  try {
    data = await loadChallenge(supabase, id, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load this challenge."} />;
  }
  if (!data) notFound();
  const { challenge, totalActivity, improvement, showImprovement } = data;
  const { data: profile } = await supabase.from("profiles").select("name, nickname, use_nickname").eq("id", user.id).single();
  const viewerName = profile?.use_nickname && profile.nickname ? profile.nickname : profile?.name ?? "You";

  return (
    <div className="space-y-5 pb-4">
      <RealtimeRefresher table="challenge_participants" filter={`challenge_id=eq.${id}`} />

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{challenge.title}</h1>
          {challenge.is_official && <Badge>Official</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Goal: {formatNumber(Number(challenge.goal_value))} {challenge.unit} · ends {new Date(challenge.end_date).toLocaleDateString()}
          {challenge.group_a && challenge.group_b && ` · ${challenge.group_a} vs ${challenge.group_b}`}
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <LeaderboardTabs
            totalActivity={totalActivity}
            improvement={improvement}
            viewerName={viewerName}
            totalUnit={challenge.unit}
            showImprovement={showImprovement}
          />
        </CardContent>
      </Card>
    </div>
  );
}
