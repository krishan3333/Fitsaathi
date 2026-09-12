"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function AnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("coordinator_broadcast_announcement", { announcement_title: title, announcement_body: body });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
    setTitle("");
    setBody("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setSent(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Megaphone /> Announcement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish campus announcement</DialogTitle>
          <DialogDescription>Sent to every student as a notification.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sports Week starts Monday!" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Input required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Join the campus-wide step challenge all week." />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {sent && <p className="text-sm text-success">Announcement sent!</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Publish
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
