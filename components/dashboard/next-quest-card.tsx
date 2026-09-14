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
    <Card className="border-none bg-gradient-to-br from-primary via-primary to-accent-purple text-primary-foreground shadow-lift hover:shadow-float transition-all duration-300 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <CardContent className="py-6 relative z-10">
        <p className="flex items-center gap-1.5 text-[0.75rem] font-bold uppercase tracking-wider text-primary-foreground/85">
          <Sparkles className="size-4 animate-pulse-soft text-yellow-300" /> Next up for you
        </p>

        <h3 className="mt-3 text-[1.4rem] font-bold leading-tight tracking-tight text-white">{quest.title}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8rem] font-medium text-primary-foreground/90">
          <span className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 backdrop-blur-md">
            <Clock className="size-3.5" /> {time}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 backdrop-blur-md">
            <MapPin className="size-3.5" /> {quest.location}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 font-semibold capitalize backdrop-blur-md">{quest.indoor_outdoor}</span>
        </div>

        <div className="mt-6 flex flex-wrap sm:flex-nowrap gap-3">
          <Button
            asChild
            className="flex-1 bg-white text-primary font-bold shadow-soft hover:bg-white/95 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Link href={`/quest?start=${quest.id}`}>Start quest</Link>
          </Button>
          <InviteFriendsDialog
            title="Group quest invite"
            body={`Join me for "${quest.title}" — ${time}.`}
            trigger={
              <Button
                variant="outline"
                className="flex-1 border-white/40 bg-white/10 text-white font-semibold hover:bg-white/20 hover:border-white/60 active:scale-95 transition-all backdrop-blur-md"
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
