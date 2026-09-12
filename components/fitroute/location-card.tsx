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
    <Card className={cn("cursor-pointer transition-colors", selected && "border-primary ring-1 ring-primary/30")} onClick={onSelect}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium">{spot.name}</h3>
            <p className="text-xs text-muted-foreground">{detailParts.join(" · ")}</p>
          </div>
          {isCurated && <Badge variant={spot.isOpen ? "success" : "danger"}>{spot.isOpen ? "Open" : "Closed"}</Badge>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isCurated ? (
            <>
              <Badge variant={CROWD_VARIANT[spot.crowdLevel ?? "Low"]}><Users className="size-3" /> {spot.crowdLevel} crowd</Badge>
              <Badge variant="muted"><ShieldCheck className="size-3" /> {spot.safetyRating} lighting</Badge>
              {spot.hasWater && <Badge variant="muted"><Droplet className="size-3" /> Water</Badge>}
            </>
          ) : (
            <Badge variant="muted"><MapPin className="size-3" /> via OpenStreetMap</Badge>
          )}
        </div>

        {selected && (
          <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <GpsSessionDialog
              locationName={spot.name}
              trigger={
                <Button className="w-full" size="sm" disabled={isCurated && !spot.isOpen}>
                  Start Route
                </Button>
              }
            />
            {isCurated && (
              <div className="rounded-xl bg-muted p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Is this place crowded now?</p>
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
