import Link from "next/link";
import { Sparkles, Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteFriendsDialog } from "@/components/quests/invite-friends-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Quest } from "@/lib/supabase/types";

/** The one saturated block on the dashboard. Everything else is paper and
 * hairlines, so the single action we actually want tapped carries the colour. */
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
    <Card className="border-transparent bg-primary text-primary-foreground shadow-lift">
      <CardContent className="py-5">
        <p className="flex items-center gap-1.5 text-[0.72rem] font-medium text-primary-foreground/75">
          <Sparkles className="size-3.5" /> Next up for you
        </p>

        <h3 className="mt-2.5 text-[1.3rem] font-semibold leading-snug tracking-[-0.02em]">{quest.title}</h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.78rem] text-primary-foreground/80">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> {time}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {quest.location}
          </span>
          <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5">{quest.indoor_outdoor}</span>
        </div>

        <div className="mt-5 flex gap-2.5">
          <Button
            asChild
            className="flex-1 bg-primary-foreground text-primary shadow-none hover:-translate-y-0 hover:shadow-none hover:brightness-95"
          >
            <Link href={`/quest?start=${quest.id}`}>Start quest</Link>
          </Button>
          <InviteFriendsDialog
            title="Group quest invite"
            body={`Join me for "${quest.title}" — ${time}.`}
            trigger={
              <Button
                variant="outline"
                className="flex-1 border-primary-foreground/30 bg-transparent text-primary-foreground hover:border-primary-foreground/50 hover:bg-primary-foreground/10"
              >
                Invite friends
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
