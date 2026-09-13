"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Navigation, Square, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { estimateStepsFromDistance } from "@/lib/geo";
import { useGpsTracker } from "@/lib/use-gps-tracker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StartSquadDialog } from "@/components/squad/start-squad-dialog";
import type { ActivityType } from "@/lib/supabase/types";

type SaveStatus = "idle" | "saving" | "done";

export function GpsSessionDialog({ locationName, trigger }: { locationName: string; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [type, setType] = useState<ActivityType>("walk");
  const tracker = useGpsTracker();
  const { distanceKm, elapsedSec, error } = tracker;
  // tracker.status covers idle/tracking/error; saveStatus layers saving/done
  // on top once tracking has actually stopped — the two never overlap since
  // saveSession() always calls tracker.stop() first.
  const status = saveStatus !== "idle" ? saveStatus : tracker.status;

  async function saveSession() {
    tracker.stop();
    setSaveStatus("saving");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Manual entry, quest completion, and GPS distance are what update totals for
    // this MVP — see lib/quest-context.ts. Swap this insert for a Health Connect
    // sync once that integration lands, same `activities` shape either way.
    await supabase.from("activities").insert({
      profile_id: userData.user.id,
      activity_type: type,
      distance_km: Number(distanceKm.toFixed(2)),
      steps: estimateStepsFromDistance(distanceKm),
      active_minutes: Math.round(elapsedSec / 60),
      source: "gps_route",
    });

    setSaveStatus("done");
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) tracker.stop();
    setOpen(next);
    if (!next) setSaveStatus("idle");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>GPS session — {locationName}</DialogTitle>
          <DialogDescription>Tracks live distance via your device GPS. Steps shown are an estimate, not a pedometer reading.</DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Activity type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">Walk</SelectItem>
                  <SelectItem value="run">Run</SelectItem>
                  <SelectItem value="cycle">Cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={tracker.start}>
              <Navigation /> Start Route
            </Button>
            <StartSquadDialog
              defaultActivityType={type as "walk" | "run" | "cycle"}
              trigger={
                <Button variant="outline" className="w-full">
                  <Users /> Do this with your squad
                </Button>
              }
            />
          </div>
        )}

        {status === "tracking" && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-success">
              <span className="flex size-2 animate-pulse-soft rounded-full bg-success" /> Tracking
            </div>
            <div className="flex justify-center gap-8">
              <div>
                <p className="text-2xl font-bold">{distanceKm.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:{String(elapsedSec % 60).padStart(2, "0")}</p>
                <p className="text-xs text-muted-foreground">time</p>
              </div>
            </div>
            <Button variant="destructive" className="w-full" onClick={saveSession}>
              <Square /> Stop & Save
            </Button>
          </div>
        )}

        {status === "saving" && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" /> Saving session…
          </div>
        )}

        {status === "done" && (
          <div className="space-y-2 py-4 text-center">
            <p className="font-medium text-success">Session saved!</p>
            <p className="text-sm text-muted-foreground">{distanceKm.toFixed(2)} km logged to your activity totals.</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3 py-4 text-center">
            <MapPin className="mx-auto size-6 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
