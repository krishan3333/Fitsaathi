import { Bike, Dumbbell, Footprints, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { trustLabel } from "@/lib/squad";
import type { Activity } from "@/lib/supabase/types";

const ICONS = { walk: Footprints, run: Footprints, cycle: Bike, workout: Dumbbell, quest: Dumbbell, gps_route: MapPin };

const SOURCE_LABELS: Record<Exclude<Activity["source"], "squad">, string> = {
  manual: "Self-reported",
  gps_route: "GPS-tracked",
  quest: "Quest-verified",
};

function sourceLabel(a: Activity) {
  return a.source === "squad" ? trustLabel(a) : SOURCE_LABELS[a.source];
}

export function ActivityHistory({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity history</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyState icon={Footprints} title="No activity yet" description="Your logged walks, runs, and quests will show up here." />
        ) : (
          <div className="space-y-0.5">
            {activities.map((a) => {
              const Icon = ICONS[a.activity_type] ?? Footprints;
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-muted/60">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize tracking-[-0.01em]">{a.activity_type.replace("_", " ")}</p>
                    <p className="text-[0.72rem] text-muted-foreground">{new Date(a.occurred_on).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="shrink-0 text-right text-[0.72rem] text-muted-foreground">
                    {a.steps > 0 && <p><span className="tnum text-foreground">{a.steps}</span> steps</p>}
                    {a.distance_km > 0 && <p><span className="tnum text-foreground">{a.distance_km}</span> km</p>}
                    {a.active_minutes > 0 && <p><span className="tnum text-foreground">{a.active_minutes}</span> min</p>}
                  </div>
                  <Badge
                    variant={a.source === "manual" ? "muted" : a.source === "squad" && !a.peer_verified ? "warning" : "success"}
                    className="shrink-0"
                  >
                    {a.source === "squad" && a.peer_verified && <Users />}
                    {sourceLabel(a)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
