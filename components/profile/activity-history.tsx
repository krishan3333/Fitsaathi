import { Bike, Dumbbell, Footprints, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Activity } from "@/lib/supabase/types";

const ICONS = { walk: Footprints, run: Footprints, cycle: Bike, workout: Dumbbell, quest: Dumbbell, gps_route: MapPin };

const SOURCE_LABELS: Record<Activity["source"], string> = {
  manual: "Self-reported",
  gps_route: "GPS-tracked",
  quest: "Quest-verified",
};

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
          <div className="space-y-1">
            {activities.map((a) => {
              const Icon = ICONS[a.activity_type] ?? Footprints;
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-muted">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">{a.activity_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.occurred_on).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {a.steps > 0 && <p>{a.steps} steps</p>}
                    {a.distance_km > 0 && <p>{a.distance_km} km</p>}
                    {a.active_minutes > 0 && <p>{a.active_minutes} min</p>}
                  </div>
                  <Badge variant={a.source === "manual" ? "muted" : "success"}>{SOURCE_LABELS[a.source]}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
