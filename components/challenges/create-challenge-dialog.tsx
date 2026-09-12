"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChallengeType } from "@/lib/supabase/types";

const TYPES: { value: ChallengeType; label: string; unit: string }[] = [
  { value: "daily_steps", label: "Daily steps", unit: "steps" },
  { value: "weekly_steps", label: "Weekly steps", unit: "steps" },
  { value: "walking_distance", label: "Walking distance", unit: "km" },
  { value: "running_distance", label: "Running distance", unit: "km" },
  { value: "cycling_distance", label: "Cycling distance", unit: "km" },
  { value: "workout_minutes", label: "Workout minutes", unit: "minutes" },
  { value: "active_streak", label: "Active-day streak", unit: "days" },
  { value: "team_steps", label: "Team total step goal", unit: "steps" },
  { value: "department_vs_department", label: "Department vs department", unit: "steps" },
  { value: "hostel_vs_hostel", label: "Hostel vs hostel", unit: "steps" },
];

const IS_VS_TYPE = (t: ChallengeType) => t === "department_vs_department" || t === "hostel_vs_hostel";

export function CreateChallengeDialog({ open: openProp, onOpenChange, trigger }: { open?: boolean; onOpenChange?: (v: boolean) => void; trigger?: React.ReactNode }) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChallengeType>("weekly_steps");
  const [circleId, setCircleId] = useState("");
  const [goal, setGoal] = useState("");
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [days, setDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: memberships } = await supabase.from("circle_members").select("fit_circles(id, name)").eq("profile_id", data.user.id);
      const list = (memberships ?? []).map((m) => m.fit_circles as unknown as { id: string; name: string }).filter(Boolean);
      setCircles(list);
      if (list[0]) setCircleId(list[0].id);
    });
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!circleId) {
      setError("Join or create a Fit Circle first.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + Number(days) * 86400000).toISOString().slice(0, 10);
    const meta = TYPES.find((t) => t.value === type)!;

    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        circle_id: circleId,
        created_by: userData.user.id,
        title,
        type,
        goal_value: Number(goal),
        unit: meta.unit,
        start_date: startDate,
        end_date: endDate,
        group_a: IS_VS_TYPE(type) ? groupA : null,
        group_b: IS_VS_TYPE(type) ? groupB : null,
      })
      .select("id")
      .single();

    if (error || !challenge) {
      setSaving(false);
      setError(error?.message ?? "Couldn't create challenge.");
      return;
    }
    await supabase.from("challenge_participants").insert({ challenge_id: challenge.id, profile_id: userData.user.id });

    setSaving(false);
    setOpen(false);
    router.push(`/challenges/${challenge.id}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a challenge</DialogTitle>
          <DialogDescription>Scoped to one of your Fit Circles.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fit Circle</Label>
            <Select value={circleId} onValueChange={setCircleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Fit Circle" />
              </SelectTrigger>
              <SelectContent>
                {circles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend Step Sprint" />
          </div>
          <div className="space-y-1.5">
            <Label>Challenge type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ChallengeType)}>
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
          {IS_VS_TYPE(type) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Group A</Label>
                <Input required value={groupA} onChange={(e) => setGroupA(e.target.value)} placeholder="CSE" />
              </div>
              <div className="space-y-1.5">
                <Label>Group B</Label>
                <Input required value={groupB} onChange={(e) => setGroupB(e.target.value)} placeholder="ECE" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Goal ({TYPES.find((t) => t.value === type)?.unit})</Label>
              <Input required type="number" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="100000" />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (days)</Label>
              <Input required type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Create challenge
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
