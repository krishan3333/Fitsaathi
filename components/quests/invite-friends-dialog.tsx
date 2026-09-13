"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { initials } from "@/lib/utils";

interface Friend {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export function InviteFriendsDialog({ trigger, title, body }: { trigger: React.ReactNode; title: string; body: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: memberships } = await supabase.from("circle_members").select("circle_id").eq("profile_id", userData.user.id);
      const circleIds = (memberships ?? []).map((m) => m.circle_id);
      if (circleIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }
      const { data: mates } = await supabase.from("circle_members").select("profile_id").in("circle_id", circleIds);
      const mateIds = [...new Set((mates ?? []).map((m) => m.profile_id))].filter((id) => id !== userData.user!.id);
      // Names come from the curated public view — see migration 0005.
      const { data: profiles } = mateIds.length
        ? await supabase.from("public_profiles").select("id, name, avatar_url").in("id", mateIds)
        : { data: [] };
      setFriends((profiles ?? []).map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url })));
      setLoading(false);
    })();
  }, [open]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setLoading(true);
      setSent(false);
      setError(null);
    }
  }

  async function sendInvites() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("notify_circle_mates", {
      p_profile_ids: [...selected],
      p_title: title,
      p_body: body,
      p_type: "invite",
    });
    if (error) {
      setError("Couldn't send invites — try again.");
      return;
    }
    setSent(true);
    setSelected(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
          <DialogDescription>Pick Fit Circle members to notify.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading your Fit Circle…</p>
        ) : friends.length === 0 ? (
          <EmptyState icon={UserPlus} title="No Fit Circle friends yet" description="Join or create a Fit Circle to invite people." />
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {friends.map((f) => (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted"
              >
                <Avatar>
                  <AvatarImage src={f.avatarUrl ?? undefined} alt={f.name} />
                  <AvatarFallback>{initials(f.name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">{f.name}</span>
                {selected.has(f.id) && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {sent && <p className="mt-3 text-center text-sm font-medium text-success">Invites sent!</p>}
        {error && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-medium text-danger">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}

        {friends.length > 0 && (
          <Button className="mt-4 w-full" disabled={selected.size === 0} onClick={sendInvites}>
            {loading && <Loader2 className="animate-spin" />}
            Send invite{selected.size > 1 ? "s" : ""}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
