import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateQuest } from "@/lib/quest-generator";

const RECENT_TITLES_LIMIT = 5;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ generated: false }, { status: 401 });

  // Skip generating if this student already has an unused personal quest
  // sitting in their pool — avoids runaway generation/quota use. PostgREST
  // filters can't express a subquery, so compute the "unused" set in JS.
  const [{ data: personalQuests }, { data: completedIds }] = await Promise.all([
    supabase.from("quests").select("id").eq("profile_id", user.id),
    supabase.from("quest_completions").select("quest_id").eq("profile_id", user.id),
  ]);
  const completedSet = new Set((completedIds ?? []).map((c) => c.quest_id));
  const hasUnusedPersonalQuest = (personalQuests ?? []).some((q) => !completedSet.has(q.id));
  if (hasUnusedPersonalQuest) {
    return NextResponse.json({ generated: false, reason: "already has an unused personal quest" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("fitness_goal, fitness_level, preferred_activities, preferred_duration, indoor_outdoor, account_type, college")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return NextResponse.json({ generated: false }, { status: 500 });

  const [{ data: collegeLocations }, { data: recentQuests }] = await Promise.all([
    profile.college
      ? supabase.from("campus_locations").select("name").eq("college", profile.college).limit(20)
      : Promise.resolve({ data: [] as { name: string }[] }),
    supabase
      .from("quest_completions")
      .select("quests(title)")
      .eq("profile_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(RECENT_TITLES_LIMIT),
  ]);

  const recentTitles = (recentQuests ?? [])
    .map((r) => (r.quests as unknown as { title: string } | null)?.title)
    .filter((t): t is string => Boolean(t));

  const generated = await generateQuest({
    goal: profile.fitness_goal,
    level: profile.fitness_level,
    preferredActivities: profile.preferred_activities ?? [],
    preferredDuration: profile.preferred_duration,
    indoorOutdoor: profile.indoor_outdoor,
    accountType: profile.account_type,
    collegeVenues: (collegeLocations ?? []).map((l) => l.name),
    recentTitles,
  });

  if (!generated) return NextResponse.json({ generated: false });

  // Inserted via the caller's own RLS-enforced session — the
  // quests_insert_own_generated policy only allows profile_id = auth.uid(),
  // so this can never write into the shared catalogue or another student's pool.
  const { data: quest, error: insertError } = await supabase
    .from("quests")
    .insert({ ...generated, profile_id: user.id })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ generated: false });
  return NextResponse.json({ generated: true, quest });
}
