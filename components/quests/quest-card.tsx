"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Flame, MapPin, Loader2, Play, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteFriendsDialog } from "@/components/quests/invite-friends-dialog";
import type { Quest } from "@/lib/supabase/types";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function QuestCard({ quest, reason, highlighted = false }: { quest: Quest; reason?: string; highlighted?: boolean }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startQuest() {
    setSecondsLeft(quest.duration_minutes * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function markComplete() {
    setCompleting(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("quest_completions").insert({ quest_id: quest.id, profile_id: userData.user.id });
    setCompleting(false);
    setCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Best-effort — a Gemini hiccup or free-tier rate limit must never block
    // or fail the completion itself. lib/quest-generator.ts already fails
    // soft; this just makes sure a network error here can't throw either.
    fetch("/api/quests/generate", { method: "POST" }).catch(() => {});

    router.refresh();
  }

  return (
    <Card className={highlighted ? "border-primary ring-1 ring-primary/30" : undefined}>
      <CardContent className="py-4">
        {reason && <p className="mb-2 text-xs font-medium text-primary">{reason}</p>}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{quest.title}</h3>
          <Badge variant={quest.indoor_outdoor === "Outdoor" ? "success" : "default"}>{quest.indoor_outdoor}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="size-3.5" /> {quest.duration_minutes} min</span>
          <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {quest.location}</span>
          <span className="flex items-center gap-1"><Flame className="size-3.5" /> {quest.difficulty}</span>
          <span className="flex items-center gap-1"><Trophy className="size-3.5" /> {quest.estimated_steps > 0 ? `${quest.estimated_steps} steps` : `${quest.points} pts`}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {secondsLeft === null ? (
            <Button size="sm" onClick={startQuest} disabled={completed}>
              <Play /> Start Quest
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              {formatCountdown(secondsLeft)} left
            </Button>
          )}
          <InviteFriendsDialog
            title="Quest invite"
            body={`Join me for "${quest.title}" at ${quest.location}.`}
            trigger={<Button size="sm" variant="outline">Invite Friends</Button>}
          />
          <Button size="sm" variant={completed ? "outline" : "success"} disabled={completing || completed} onClick={markComplete}>
            {completing ? <Loader2 className="animate-spin" /> : completed ? <Check /> : null}
            {completed ? "Completed" : "Mark Complete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
