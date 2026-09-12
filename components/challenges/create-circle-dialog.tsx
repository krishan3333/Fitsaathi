"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function CreateCircleDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: circle, error } = await supabase
      .from("fit_circles")
      .insert({ name, invite_code: randomCode(), created_by: userData.user.id })
      .select("id")
      .single();

    if (error || !circle) {
      setSaving(false);
      setError(error?.message ?? "Couldn't create Fit Circle.");
      return;
    }
    await supabase.from("circle_members").insert({ circle_id: circle.id, profile_id: userData.user.id });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    // A plain select-then-insert can't work here: RLS only lets you SELECT a
    // circle you're already a member of, which is exactly what joining by
    // code needs to do *before* you're a member. This RPC looks the circle
    // up server-side and adds you in one step — see migration 0011.
    const { error } = await supabase.rpc("join_circle_by_code", { p_invite_code: code.trim() });
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fit Circle</DialogTitle>
          <DialogDescription>Create a private circle or join one with an invite code (or its QR code).</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">Create</TabsTrigger>
            <TabsTrigger value="join" className="flex-1">Join</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Circle name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="CSE Walkers" />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create Fit Circle
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="join">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Invite code</Label>
                <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSEW-2026" />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> Ask a friend to share their circle&apos;s code or QR.
                </p>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Join Fit Circle
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
