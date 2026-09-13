import { createClient } from "@/lib/supabase/server";
import { buildQuestContext } from "@/lib/quest-context";
import { recommendQuests } from "@/lib/quest-engine";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { QuestCard } from "@/components/quests/quest-card";
import { FitWindowsCard } from "@/components/dashboard/fit-windows-card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

async function loadQuests(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ plannerInput, friendsAvailable, fitWindows }, questsRes] = await Promise.all([
    buildQuestContext(supabase, userId),
    supabase.from("quests").select("*"),
  ]);
  const recommendations = recommendQuests(questsRes.data ?? [], plannerInput, 5);
  return { recommendations, plannerInput, friendsAvailable, fitWindows };
}

export default async function QuestPage({ searchParams }: PageProps<"/quest">) {
  const { start, window: windowParam } = await searchParams;
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
  const { recommendations, plannerInput, friendsAvailable, fitWindows } = data;
  const highlightWindow = typeof windowParam === "string" ? windowParam : undefined;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="display text-[1.6rem] leading-none">Smart Fitness Quest</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          Picked for your goal, the time you actually have free, and what the weather is doing. Plain rules, no chatbot.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="muted">{plannerInput.freeMinutes} min free</Badge>
        <Badge variant={plannerInput.greenWindow === "green" ? "success" : plannerInput.greenWindow === "yellow" ? "warning" : "danger"}>
          {plannerInput.greenWindow === "green" ? "Good outdoor conditions" : plannerInput.greenWindow === "yellow" ? "Borderline conditions" : "Indoor recommended"}
        </Badge>
        {friendsAvailable > 0 && <Badge variant="default">{friendsAvailable} friends free</Badge>}
      </div>

      <FitWindowsCard windows={fitWindows} compact highlight={highlightWindow} />

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
