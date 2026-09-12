import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { CircleCard } from "@/components/challenges/circle-card";
import { CreateCircleDialog } from "@/components/challenges/create-circle-dialog";
import { CreateChallengeLauncher } from "@/components/challenges/create-challenge-launcher";
import { ChallengeCard, type ChallengeCardData } from "@/components/challenges/challenge-card";
import { Button } from "@/components/ui/button";
import type { ChallengeType } from "@/lib/supabase/types";

const TEAM_TYPES = new Set<ChallengeType>(["team_steps", "department_vs_department", "hostel_vs_hostel"]);

async function loadChallenges(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: memberships } = await supabase.from("circle_members").select("circle_id, fit_circles(id, name, invite_code)").eq("profile_id", userId);
  const circles = (memberships ?? []).map((m) => m.fit_circles as unknown as { id: string; name: string; invite_code: string }).filter(Boolean);

  const circlesWithMembers = await Promise.all(
    circles.map(async (c) => {
      const { data: members } = await supabase.from("circle_members").select("profile_id").eq("circle_id", c.id);
      const memberIds = (members ?? []).map((m) => m.profile_id);
      const { data: profiles } = memberIds.length
        ? await supabase.from("public_profiles").select("id, name").in("id", memberIds)
        : { data: [] };
      return { ...c, members: (profiles ?? []) as { id: string; name: string }[] };
    })
  );

  const { data: challenges } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
  const challengeIds = (challenges ?? []).map((c) => c.id);

  const [{ data: allParticipants }, { data: myParticipants }] = await Promise.all([
    challengeIds.length ? supabase.from("challenge_participants").select("challenge_id, profile_id, progress_value").in("challenge_id", challengeIds) : Promise.resolve({ data: [] }),
    challengeIds.length ? supabase.from("challenge_participants").select("challenge_id, progress_value").eq("profile_id", userId).in("challenge_id", challengeIds) : Promise.resolve({ data: [] }),
  ]);

  const myProgress = new Map((myParticipants ?? []).map((p) => [p.challenge_id, p.progress_value]));
  const teamTotals = new Map<string, number>();
  for (const p of allParticipants ?? []) {
    teamTotals.set(p.challenge_id, (teamTotals.get(p.challenge_id) ?? 0) + Number(p.progress_value));
  }

  const cards: ChallengeCardData[] = (challenges ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    goalValue: Number(c.goal_value),
    unit: c.unit,
    current: TEAM_TYPES.has(c.type) ? teamTotals.get(c.id) ?? 0 : Number(myProgress.get(c.id) ?? 0),
    isOfficial: c.is_official,
    isJoined: myProgress.has(c.id),
    endDate: c.end_date,
  }));

  return { circlesWithMembers, cards };
}

export default async function ChallengesPage({ searchParams }: PageProps<"/challenges">) {
  const { create } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadChallenges>>;
  try {
    data = await loadChallenges(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load challenges."} />;
  }
  const { circlesWithMembers, cards } = data;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Challenges</h1>
        <CreateChallengeLauncher autoOpen={create === "1"} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Your Fit Circles</h2>
          <CreateCircleDialog trigger={<Button variant="outline" size="sm">Create / Join</Button>} />
        </div>
        {circlesWithMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Fit Circle yet"
            description="Create a private circle or join one with an invite code."
            action={<CreateCircleDialog trigger={<Button size="sm">Get started</Button>} />}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {circlesWithMembers.map((c) => (
              <CircleCard key={c.id} name={c.name} inviteCode={c.invite_code} members={c.members} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Challenges</h2>
        {cards.length === 0 ? (
          <EmptyState icon={Users} title="No challenges yet" description="Start one for your Fit Circle." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
