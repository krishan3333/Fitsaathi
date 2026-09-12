"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActivityType } from "@/lib/supabase/types";

const TYPES: { value: ActivityType; label: string }[] = [
  { value: "walk", label: "Walk" },
  { value: "run", label: "Run" },
  { value: "cycle", label: "Cycle" },
  { value: "workout", label: "Workout" },
];

export function LogActivityDialog({ trigger, defaultType = "walk" }: { trigger: React.ReactNode; defaultType?: ActivityType }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>(defaultType);
  const [steps, setSteps] = useState("");
  const [distance, setDistance] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const stepsNum = Number(steps) || 0;
    const distanceNum = Number(distance) || 0;
    const minutesNum = Number(minutes) || 0;
    if (stepsNum > 50000 || distanceNum > 100 || minutesNum > 600) {
      setError("That's beyond a realistic single entry — max 50,000 steps, 100 km, or 600 minutes. Self-reported entries are capped for fair leaderboards.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("activities").insert({
      profile_id: userData.user.id,
      activity_type: type,
      steps: stepsNum,
      distance_km: distanceNum,
      active_minutes: minutesNum,
      source: "manual",
      occurred_on: new Date().toISOString().slice(0, 10),
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSteps("");
    setDistance("");
    setMinutes("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an activity</DialogTitle>
          <DialogDescription>
            Manual entry updates your totals, streak, and any challenges you&apos;re in. Steps are self-reported —
            we don&apos;t claim browser-pedometer accuracy.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Activity type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Steps</Label>
              <Input type="number" min={0} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Distance (km)</Label>
              <Input type="number" min={0} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Minutes</Label>
              <Input type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save activity
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
