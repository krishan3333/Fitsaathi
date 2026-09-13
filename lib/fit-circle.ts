// A student's Fit Circle summary (name + today's team-steps challenge
// progress), extracted from app/(app)/page.tsx so lib/nudge-generator.ts can
// reuse it for the circle_close nudge without duplicating the query shape.
import type { createClient } from "./supabase/server";

type AnyClient = Awaited<ReturnType<typeof createClient>>;

export interface FitCircleSummary {
  name: string;
  current: number;
  goal: number;
  challengeId: string;
}

/** First circle the student belongs to + its team-steps challenge, if any. */
export async function loadFitCircle(supabase: AnyClient, profileId: string): Promise<FitCircleSummary | null> {
  const { data: membership } = await supabase
    .from("circle_members")
    .select("circle_id, fit_circles(id, name)")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();
  const circleId = membership?.circle_id;
  if (!circleId) return null;

  const circleName = (membership!.fit_circles as unknown as { name: string })?.name ?? "Fit Circle";
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, goal_value")
    .eq("circle_id", circleId)
    .eq("type", "team_steps")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge) return null;

  const { data: participants } = await supabase.from("challenge_participants").select("progress_value").eq("challenge_id", challenge.id);
  const current = (participants ?? []).reduce((s, p) => s + Number(p.progress_value), 0);
  return { name: circleName, current, goal: Number(challenge.goal_value), challengeId: challenge.id };
}
