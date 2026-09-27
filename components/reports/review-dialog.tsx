"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReviewTargetType } from "@/lib/supabase/types";

export function ReviewDialog({
  trigger,
  presetFacility,
  facilityOptions = [],
}: {
  trigger: React.ReactNode;
  presetFacility?: { id: string; name: string };
  facilityOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<ReviewTargetType>("facility");
  const [facilityId, setFacilityId] = useState(presetFacility?.id ?? "");
  const [coachName, setCoachName] = useState("");
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Pick a star rating first.");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }

    const resolvedType = presetFacility ? "facility" : targetType;
    const targetLocationId = resolvedType === "facility" ? (presetFacility?.id ?? facilityId) : null;
    const targetLabel = resolvedType === "facility" ? (presetFacility?.name ?? facilityOptions.find((f) => f.id === facilityId)?.name ?? "") : coachName.trim();

    if (!targetLabel || (resolvedType === "facility" && !targetLocationId)) {
      setSaving(false);
      setError("Pick or name what you're reviewing.");
      return;
    }

    const { error: insertError } = await supabase
      .from("reviews")
      .insert({ profile_id: userData.user.id, target_type: resolvedType, target_location_id: targetLocationId, target_label: targetLabel, rating, body });

    if (insertError?.code === "23505" && resolvedType === "facility" && targetLocationId) {
      const { error: updateError } = await supabase.from("reviews").update({ rating, body }).eq("profile_id", userData.user.id).eq("target_location_id", targetLocationId);
      setSaving(false);
      if (updateError) {
        setError("Couldn't save your review — try again.");
        return;
      }
    } else if (insertError) {
      setSaving(false);
      setError(insertError.code === "23505" ? "You've already reviewed this coach — edit it from My Reviews." : "Couldn't save your review — try again.");
      return;
    } else {
      setSaving(false);
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
          <DialogTitle>Rate &amp; review</DialogTitle>
          <DialogDescription>{presetFacility ? presetFacility.name : "Shared with every student — a coordinator can hide it if it's inappropriate."}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="text-sm text-success">Thanks for the review!</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!presetFacility && (
              <div className="space-y-1.5">
                <Label>What are you reviewing?</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as ReviewTargetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
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

            {!presetFacility && targetType === "coach" && (
              <div className="space-y-1.5">
                <Label>Coach&apos;s name</Label>
                <Input required value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Coach Sharma" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Rating</Label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1.5">
              <Label>Review (optional)</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was it like?" />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Star />}
              Submit review
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
