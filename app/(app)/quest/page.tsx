import { createClient } from "@/lib/supabase/server";
import { buildQuestContext } from "@/lib/quest-context";
import { recommendQuests } from "@/lib/quest-engine";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { QuestCard } from "@/components/quests/quest-card";
import { Badge } from "@/components/ui/badge";
import { Compass, Sparkles } from "lucide-react";

async function loadQuests(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ plannerInput, friendsAvailable }, questsRes] = await Promise.all([
    buildQuestContext(supabase, userId),
    supabase.from("quests").select("*"),
  ]);
  const recommendations = recommendQuests(questsRes.data ?? [], plannerInput, 5);
  return { recommendations, plannerInput, friendsAvailable };
}

export default async function QuestPage({ searchParams }: PageProps<"/quest">) {
  const { start } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let data: Awaited<ReturnType<typeof loadQuests>>;
  try {
    data = await loadQuests(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load quests."} />;
  }
  const { recommendations, plannerInput, friendsAvailable } = data;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Compass className="size-5 text-primary" /> Smart Fitness Quest
        </h1>
        <p className="text-sm text-muted-foreground">Picked for your goal, free time, and today&apos;s conditions — not a chatbot, just simple rules.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="muted">{plannerInput.freeMinutes} min free</Badge>
        <Badge variant={plannerInput.greenWindow === "green" ? "success" : plannerInput.greenWindow === "yellow" ? "warning" : "danger"}>
          {plannerInput.greenWindow === "green" ? "Good outdoor conditions" : plannerInput.greenWindow === "yellow" ? "Borderline conditions" : "Indoor recommended"}
        </Badge>
        {friendsAvailable > 0 && <Badge variant="default">{friendsAvailable} friends free</Badge>}
      </div>

      {recommendations.length === 0 ? (
        <EmptyState icon={Sparkles} title="No quests available" description="Check back soon — the quest catalogue is being restocked." />
      ) : (
        <div className="space-y-3">
          {recommendations.map(({ quest, reason }) => (
            <QuestCard key={quest.id} quest={quest} reason={reason} highlighted={quest.id === start} />
          ))}
        </div>
      )}
    </div>
  );
}
