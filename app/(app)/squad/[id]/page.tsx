import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { SquadLiveBoard } from "@/components/squad/squad-live-board";
import type { RosterMember } from "@/components/squad/squad-roster";
import type { SquadFinalizeResult } from "@/lib/use-squad-channel";

async function loadSession(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  // squad_sessions_select_member (0021) already scopes this to the host or a
  // participant — a stranger gets zero rows, same as any other RLS miss.
  const { data: session, error } = await supabase.from("squad_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const { data: participants } = await supabase
    .from("squad_participants")
    .select("profile_id, verified, verified_reason, distance_km, steps, active_minutes")
    .eq("session_id", sessionId);

  const profileIds = (participants ?? []).map((p) => p.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from("public_profiles").select("id, name, nickname, use_nickname, avatar_url").in("id", profileIds)
    : { data: [] };

  const members: RosterMember[] = (participants ?? []).map((p) => {
    const profile = profiles?.find((pr) => pr.id === p.profile_id);
    const name = profile ? (profile.use_nickname && profile.nickname ? profile.nickname : profile.name) : "Squad member";
    return { profileId: p.profile_id, name, avatarUrl: profile?.avatar_url ?? null };
  });

  const initialResults: SquadFinalizeResult[] | null =
    session.status === "ended"
      ? (participants ?? []).map((p) => ({
          profileId: p.profile_id,
          verified: p.verified,
          verifiedReason: p.verified_reason,
          distanceKm: Number(p.distance_km),
          steps: p.steps,
          activeMinutes: p.active_minutes,
        }))
      : null;

  return { session, members, initialResults };
}

export default async function SquadSessionPage({ params }: PageProps<"/squad/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadSession>>;
  try {
    data = await loadSession(supabase, id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load this squad session."} />;
  }
  if (!data) notFound();

  const { session, members, initialResults } = data;

  return (
    <SquadLiveBoard
      sessionId={session.id}
      joinCode={session.join_code}
      hostId={session.host_id}
      currentProfileId={user.id}
      activityType={session.activity_type}
      initialStatus={session.status}
      initialMembers={members}
      initialResults={initialResults}
    />
  );
}
