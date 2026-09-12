"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SafetyRating } from "@/lib/supabase/types";

export function AddLocationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [activityType, setActivityType] = useState("");
  const [lat, setLat] = useState("28.746");
  const [lng, setLng] = useState("77.118");
  const [distance, setDistance] = useState("");
  const [steps, setSteps] = useState("");
  const [safety, setSafety] = useState<SafetyRating>("Good");
  const [hasWater, setHasWater] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [college, setCollege] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("college").eq("id", data.user.id).single();
      setCollege(profile?.college ?? null);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!college) {
      setError("Your coordinator profile has no college set — add one in your profile first.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // Always your own college, never a free-text field — keeps coordinators
    // from accidentally (or deliberately) writing into another campus's map.
    const { error } = await supabase.from("campus_locations").insert({
      college,
      name,
      activity_type: activityType,
      lat: Number(lat),
      lng: Number(lng),
      distance_km: Number(distance) || 0,
      estimated_steps: Number(steps) || 0,
      safety_rating: safety,
      has_water: hasWater,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus /> Add location</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a fitness location</DialogTitle>
          <DialogDescription>
            Appears on the FitRoute map for {college ?? "your college's"} students only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Basketball Court" />
            </div>
            <div className="space-y-1.5">
              <Label>Activity type</Label>
              <Input required value={activityType} onChange={(e) => setActivityType(e.target.value)} placeholder="Basketball" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input required type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input required type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Distance (km)</Label>
              <Input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated steps</Label>
              <Input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="w-1/2 space-y-1.5">
              <Label>Safety / lighting</Label>
              <Select value={safety} onValueChange={(v) => setSafety(v as SafetyRating)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={hasWater} onCheckedChange={setHasWater} />
              <Label>Water point</Label>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Add location
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
