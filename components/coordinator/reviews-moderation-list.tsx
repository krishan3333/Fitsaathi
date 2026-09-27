"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TARGET_TYPE_LABELS } from "@/lib/reports";
import type { Review } from "@/lib/supabase/types";

export type ReviewRow = Review & { authorName: string };

export function ReviewsModerationList({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(reviews);

  if (items.length === 0) {
    return <EmptyState icon={Star} title="No reviews yet" description="Reviews from students at your college will show up here." />;
  }

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <ReviewRowCard
          key={r.id}
          review={r}
          onUpdated={(updated) => {
            setItems((all) => all.map((x) => (x.id === updated.id ? updated : x)));
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}

function ReviewRowCard({ review, onUpdated }: { review: ReviewRow; onUpdated: (r: ReviewRow) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(review.moderation_reason ?? "");
  const [saving, setSaving] = useState(false);

  async function moderate(hide: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("moderate_review", { p_review_id: review.id, p_hide: hide, p_reason: hide ? reason || null : null });
    setSaving(false);
    if (!error) {
      onUpdated({ ...review, moderation_status: hide ? "hidden" : "visible", moderation_reason: hide ? reason || null : null });
      setOpen(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-[-0.015em]">{review.target_label}</h3>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
              {TARGET_TYPE_LABELS[review.target_type]} · {review.authorName} · {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={review.moderation_status === "hidden" ? "danger" : "success"} className="shrink-0">
            {review.moderation_status === "hidden" ? "Hidden" : "Visible"}
          </Badge>
        </div>
        <div className="mt-2">
          <StarRating value={review.rating} size="sm" />
        </div>
        {review.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.body}</p>}
        {review.moderation_status === "hidden" && review.moderation_reason && <p className="mt-2 text-sm text-danger">Reason: {review.moderation_reason}</p>}

        {review.moderation_status === "visible" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="mt-3">
                <EyeOff /> Hide
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hide this review?</DialogTitle>
                <DialogDescription>Only visible to you and the author afterwards — not the rest of the college.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Reason (shown to the author)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Contains personal attacks" />
                </div>
                <Button variant="destructive" className="w-full" disabled={saving} onClick={() => moderate(true)}>
                  {saving && <Loader2 className="animate-spin" />}
                  Hide review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button size="sm" variant="outline" className="mt-3" disabled={saving} onClick={() => moderate(false)}>
            {saving ? <Loader2 className="animate-spin" /> : <Eye />}
            Unhide
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
