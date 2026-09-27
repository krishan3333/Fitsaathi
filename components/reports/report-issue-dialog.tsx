"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPLAINT_CATEGORY_LABELS, TARGET_TYPE_LABELS } from "@/lib/reports";
import type { ComplaintCategory, ComplaintTargetType } from "@/lib/supabase/types";

const CATEGORIES = Object.keys(COMPLAINT_CATEGORY_LABELS) as ComplaintCategory[];
const TARGET_TYPES = Object.keys(TARGET_TYPE_LABELS) as ComplaintTargetType[];

export function ReportIssueDialog({
  trigger,
  presetFacility,
  facilityOptions = [],
}: {
  trigger: React.ReactNode;
  /** Opened from a specific facility card — locks the target and hides the picker. */
  presetFacility?: { id: string; name: string };
  /** Used for the generic "Report an issue" flow, when there's no preset facility. */
  facilityOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<ComplaintTargetType>("facility");
  const [facilityId, setFacilityId] = useState<string>(presetFacility?.id ?? "");
  const [freeLabel, setFreeLabel] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("safety");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }

    const targetLocationId = targetType === "facility" ? (presetFacility?.id ?? facilityId) : null;
    const targetLabel = targetType === "facility" ? (presetFacility?.name ?? facilityOptions.find((f) => f.id === facilityId)?.name ?? "") : freeLabel.trim();

    if (!targetLabel || (targetType === "facility" && !targetLocationId)) {
      setSaving(false);
      setError("Pick or name what you're reporting.");
      return;
    }

    const { error: insertError } = await supabase.from("complaints").insert({
      profile_id: userData.user.id,
      target_type: targetType,
      target_location_id: targetLocationId,
      target_label: targetLabel,
      category,
      description,
    });
    setSaving(false);
    if (insertError) {
      setError("Couldn't submit your report — try again.");
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setSubmitted(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>{presetFacility ? presetFacility.name : "A coordinator at your college reviews every report."}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="text-sm text-success">Report submitted — track it from My Reports.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!presetFacility && (
              <div className="space-y-1.5">
                <Label>What are you reporting?</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as ComplaintTargetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TARGET_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!presetFacility && targetType === "facility" && (
              <div className="space-y-1.5">
                <Label>Facility</Label>
                <Select value={facilityId} onValueChange={setFacilityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityOptions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!presetFacility && targetType !== "facility" && (
              <div className="space-y-1.5">
                <Label>{targetType === "coach" ? "Coach's name" : "Event name"}</Label>
                <Input required value={freeLabel} onChange={(e) => setFreeLabel(e.target.value)} placeholder={targetType === "coach" ? "Coach Sharma" : "Sports Week 5K"} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ComplaintCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COMPLAINT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>What happened?</Label>
              <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue…" />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Flag />}
              Submit report
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
