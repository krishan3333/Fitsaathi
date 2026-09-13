"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Swords, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNumber, cn } from "@/lib/utils";
import type { ChallengeType } from "@/lib/supabase/types";

const TYPE_LABELS: Record<ChallengeType, string> = {
  daily_steps: "Daily steps",
  weekly_steps: "Weekly steps",
  walking_distance: "Walking distance",
  running_distance: "Running distance",
  cycling_distance: "Cycling distance",
  workout_minutes: "Workout minutes",
  active_streak: "Active-day streak",
  team_steps: "Team step goal",
  department_vs_department: "Department vs department",
  hostel_vs_hostel: "Hostel vs hostel",
};

export interface ChallengeCardData {
  id: string;
  title: string;
  type: ChallengeType;
  goalValue: number;
  unit: string;
  current: number;
  isOfficial: boolean;
  isJoined: boolean;
  canDelete: boolean;
  endDate: string;
}

export function ChallengeCard({ challenge }: { challenge: ChallengeCardData }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(challenge.isJoined);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleJoin() {
    setJoining(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (joined) {
      await supabase.from("challenge_participants").delete().eq("challenge_id", challenge.id).eq("profile_id", userData.user.id);
    } else {
      await supabase.from("challenge_participants").insert({ challenge_id: challenge.id, profile_id: userData.user.id });
    }
    setJoined(!joined);
    setJoining(false);
    router.refresh();
  }

  async function deleteChallenge() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("challenges").delete().eq("id", challenge.id);
    router.refresh();
  }

  const pct = challenge.goalValue > 0 ? Math.min(100, (challenge.current / challenge.goalValue) * 100) : 0;

  return (
    <Card className="transition-[border-color,box-shadow] hover:border-foreground/15">
      <CardContent className="py-5">
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold tracking-[-0.015em]">{challenge.title}</h3>
              {challenge.isOfficial && <Badge variant="default">Official</Badge>}
            </div>
            <p className="mt-1 text-[0.72rem] text-muted-foreground">
              {TYPE_LABELS[challenge.type]} · ends {new Date(challenge.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {challenge.canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-8", confirmingDelete && "text-danger")}
                disabled={deleting}
                onClick={deleteChallenge}
                title={confirmingDelete ? "Tap again to confirm delete" : "Delete challenge"}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            )}
            <Swords className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.78rem] text-muted-foreground">
              <span className="metric-sm text-[1.05rem] text-foreground">{formatNumber(challenge.current)}</span> of{" "}
              {formatNumber(challenge.goalValue)} {challenge.unit}
            </span>
            <span className="metric-sm text-[0.95rem] text-muted-foreground">{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/challenges/${challenge.id}`}>View</Link>
          </Button>
          <Button size="sm" variant={joined ? "outline" : "default"} className="flex-1" disabled={joining} onClick={toggleJoin}>
            {joining && <Loader2 className="animate-spin" />}
            {joined ? "Leave" : "Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
