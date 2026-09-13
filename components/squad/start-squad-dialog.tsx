"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { SquadActivityType } from "@/lib/supabase/types";

export function StartSquadDialog({
  trigger,
  defaultActivityType = "walk",
  questId,
}: {
  trigger: React.ReactNode;
  defaultActivityType?: SquadActivityType;
  /** Set when starting a squad from a specific quest — locks the activity type to 'quest'. */
  questId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState<SquadActivityType>(questId ? "quest" : defaultActivityType);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_squad_session", {
      p_activity_type: questId ? "quest" : activityType,
      p_quest_id: questId ?? null,
    });
    setCreating(false);
    const session = data?.[0];
    if (error || !session) {
      setError("Couldn't start a squad session — try again.");
      return;
    }
    setOpen(false);
    router.push(`/squad/${session.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a squad session</DialogTitle>
          <DialogDescription>Everyone&apos;s progress streams live, and finishing together gets you a peer-verified activity.</DialogDescription>
        </DialogHeader>

        {!questId && (
          <div className="space-y-1.5">
            <Label>Activity</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as SquadActivityType)}>
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
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button className="w-full" disabled={creating} onClick={create}>
          {creating ? <Loader2 className="animate-spin" /> : <Play />}
          Create squad session
        </Button>
      </DialogContent>
    </Dialog>
  );
}
