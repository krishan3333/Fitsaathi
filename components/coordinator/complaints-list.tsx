"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileWarning, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_VARIANT, TARGET_TYPE_LABELS } from "@/lib/reports";
import type { Complaint, ComplaintStatus } from "@/lib/supabase/types";

export type ComplaintRow = Complaint & { reporterName: string };

const STATUSES = Object.keys(COMPLAINT_STATUS_LABELS) as ComplaintStatus[];

export function ComplaintsList({ complaints, coordinatorId }: { complaints: ComplaintRow[]; coordinatorId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(complaints);

  if (items.length === 0) {
    return <EmptyState icon={FileWarning} title="No complaints filed" description="Reports from students at your college will show up here." />;
  }

  return (
    <div className="space-y-2">
      {items.map((c) => (
        <ComplaintRowCard
          key={c.id}
          complaint={c}
          coordinatorId={coordinatorId}
          onUpdated={(updated) => {
            setItems((all) => all.map((x) => (x.id === updated.id ? updated : x)));
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}

function ComplaintRowCard({ complaint, coordinatorId, onUpdated }: { complaint: ComplaintRow; coordinatorId: string; onUpdated: (c: ComplaintRow) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [notes, setNotes] = useState(complaint.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const isResolving = status === "resolved" || status === "rejected";
    const { data, error } = await supabase
      .from("complaints")
      .update({
        status,
        admin_notes: notes || null,
        resolved_by: isResolving ? coordinatorId : null,
        resolved_at: isResolving ? new Date().toISOString() : null,
      })
      .eq("id", complaint.id)
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      onUpdated({ ...data, reporterName: complaint.reporterName });
      setOpen(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-[-0.015em]">{complaint.target_label}</h3>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
              {TARGET_TYPE_LABELS[complaint.target_type]} · {COMPLAINT_CATEGORY_LABELS[complaint.category]} · {complaint.reporterName} ·{" "}
              {new Date(complaint.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={COMPLAINT_STATUS_VARIANT[complaint.status]} className="shrink-0">
            {COMPLAINT_STATUS_LABELS[complaint.status]}
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{complaint.description}</p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="mt-3">
              Manage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update complaint</DialogTitle>
              <DialogDescription>{complaint.target_label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {COMPLAINT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Note to the reporter</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you find or do about this?" />
              </div>
              <Button className="w-full" disabled={saving} onClick={save}>
                {saving && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
