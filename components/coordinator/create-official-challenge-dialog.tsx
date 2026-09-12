"use client";

import { useState, type FormEvent } from "react";
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
  { value: "department_vs_department", label: "Department vs department", unit: "steps" },
  { value: "hostel_vs_hostel", label: "Hostel vs hostel", unit: "steps" },
  { value: "weekly_steps", label: "Campus-wide weekly steps", unit: "steps" },
];

export function CreateOfficialChallengeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChallengeType>("department_vs_department");
  const [goal, setGoal] = useState("");
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [days, setDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: ownProfile } = await supabase.from("profiles").select("college").eq("id", userData.user.id).single();

    const meta = TYPES.find((t) => t.value === type)!;
    const { error } = await supabase.from("challenges").insert({
      circle_id: null,
      created_by: userData.user.id,
      title,
      type,
      goal_value: Number(goal),
      unit: meta.unit,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + Number(days) * 86400000).toISOString().slice(0, 10),
      is_official: true,
      college: ownProfile?.college ?? null,
      group_a: type === "weekly_steps" ? null : groupA,
      group_b: type === "weekly_steps" ? null : groupB,
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
        <Button size="sm"><Plus /> Official challenge</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create official campus challenge</DialogTitle>
          <DialogDescription>Visible to every student on campus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CSE vs ECE Step Battle" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
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
          {type !== "weekly_steps" && (
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
              <Label>Goal (steps)</Label>
              <Input required type="number" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="200000" />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (days)</Label>
              <Input required type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Publish challenge
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
