"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplet, MapPin, ShieldCheck, Users, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GpsSessionDialog } from "@/components/fitroute/gps-session-dialog";
import { cn } from "@/lib/utils";
import type { MapSpot } from "@/lib/map-spot";
import type { CrowdLevel } from "@/lib/supabase/types";

const CROWD_VARIANT: Record<CrowdLevel, "success" | "warning" | "danger"> = { Low: "success", Medium: "warning", High: "danger" };

export function LocationCard({ spot, selected, onSelect }: { spot: MapSpot; selected: boolean; onSelect: () => void }) {
  const router = useRouter();
  const [checkinSaved, setCheckinSaved] = useState(false);
  const isCurated = spot.source === "curated";

  async function submitCheckin(level: CrowdLevel) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("route_checkins").insert({ location_id: spot.id, profile_id: userData.user.id, crowd_level: level });
    setCheckinSaved(true);
    router.refresh();
  }

  const detailParts = [spot.activityType];
  if (isCurated) detailParts.push(`${spot.loopKm} km`, `~${spot.estimatedSteps} steps`);
  if (spot.distanceKm !== undefined) detailParts.push(`${spot.distanceKm.toFixed(1)} km away`);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-[border-color,box-shadow]",
        selected ? "border-primary shadow-lift ring-1 ring-primary/25" : "hover:border-foreground/15"
      )}
      onClick={onSelect}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-[-0.015em]">{spot.name}</h3>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">{detailParts.join(" · ")}</p>
          </div>
          {isCurated && <Badge variant={spot.isOpen ? "success" : "danger"} className="shrink-0">{spot.isOpen ? "Open" : "Closed"}</Badge>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {isCurated ? (
            <>
              <Badge variant={CROWD_VARIANT[spot.crowdLevel ?? "Low"]}><Users /> {spot.crowdLevel} crowd</Badge>
              <Badge variant="muted"><ShieldCheck /> {spot.safetyRating} lighting</Badge>
              {spot.hasWater && <Badge variant="muted"><Droplet /> Water</Badge>}
            </>
          ) : (
            <Badge variant="muted"><MapPin /> via OpenStreetMap</Badge>
          )}
        </div>

        {selected && (
          <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <GpsSessionDialog
              locationName={spot.name}
              trigger={
                <Button className="w-full" size="sm" disabled={isCurated && !spot.isOpen}>
                  Start route
                </Button>
              }
            />
            {isCurated && (
              <div className="rounded-2xl border border-border bg-muted/50 p-3.5">
                <p className="mb-2.5 text-[0.78rem] font-medium">Is this place crowded now?</p>
                {checkinSaved ? (
                  <p className="flex items-center gap-1.5 text-sm text-success"><Check className="size-4" /> Thanks for the check-in!</p>
                ) : (
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as CrowdLevel[]).map((level) => (
                      <Button key={level} size="sm" variant="outline" className="flex-1" onClick={() => submitCheckin(level)}>
                        {level}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
