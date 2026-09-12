import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteFriendsDialog } from "@/components/quests/invite-friends-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Quest } from "@/lib/supabase/types";

export function NextQuestCard({ quest, time }: { quest: Quest | null; time: string }) {
  if (!quest) {
    return (
      <Card>
        <CardContent className="py-6">
          <EmptyState icon={Sparkles} title="No quest to suggest yet" description="Finish onboarding so we can tailor a quest to you." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <p className="text-sm font-medium text-primary">Your Next Quest</p>
        </div>
        <h3 className="text-lg font-semibold">{quest.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="muted">{time}</Badge>
          <Badge variant="muted">{quest.location}</Badge>
          <Badge variant={quest.indoor_outdoor === "Outdoor" ? "success" : "default"}>{quest.indoor_outdoor}</Badge>
        </div>
        <div className="mt-4 flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/quest?start=${quest.id}`}>Start Quest</Link>
          </Button>
          <InviteFriendsDialog
            title="Group quest invite"
            body={`Join me for "${quest.title}" — ${time}.`}
            trigger={
              <Button variant="outline" className="flex-1">
                Invite Friends
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
