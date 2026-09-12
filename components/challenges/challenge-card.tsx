"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";
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
  endDate: string;
}

export function ChallengeCard({ challenge }: { challenge: ChallengeCardData }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(challenge.isJoined);

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

  const pct = challenge.goalValue > 0 ? Math.min(100, (challenge.current / challenge.goalValue) * 100) : 0;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{challenge.title}</h3>
              {challenge.isOfficial && <Badge variant="default">Official</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[challenge.type]} · ends {new Date(challenge.endDate).toLocaleDateString()}</p>
          </div>
          <Swords className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatNumber(challenge.current)} / {formatNumber(challenge.goalValue)} {challenge.unit}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <div className="mt-3 flex gap-2">
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
