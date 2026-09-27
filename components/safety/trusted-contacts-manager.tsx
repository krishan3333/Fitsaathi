"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { TrustedContact } from "@/lib/supabase/types";

export function TrustedContactsManager({ profileId, initialContacts }: { profileId: string; initialContacts: TrustedContact[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addContact(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trusted_contacts")
      .insert({ profile_id: profileId, name, phone, relationship: relationship || null })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      setError("Couldn't add that contact — try again.");
      return;
    }
    setContacts((c) => [...c, data]);
    setName("");
    setPhone("");
    setRelationship("");
    setOpen(false);
  }

  async function removeContact(id: string) {
    setContacts((c) => c.filter((x) => x.id !== id));
    const supabase = createClient();
    await supabase.from("trusted_contacts").delete().eq("id", id);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Trusted contacts</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <UserPlus /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a trusted contact</DialogTitle>
              <DialogDescription>They&apos;ll show up as a one-tap alert option if you ever trigger SOS.</DialogDescription>
            </DialogHeader>
            <form onSubmit={addContact} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Mom" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship (optional)</Label>
                <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Parent" />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Add contact
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <EmptyState icon={UserPlus} title="No trusted contacts yet" description="Add someone who should hear from you first if you ever hit SOS." />
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.phone}
                  {c.relationship ? ` · ${c.relationship}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeContact(c.id)} aria-label={`Remove ${c.name}`}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
