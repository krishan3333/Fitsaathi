"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState } from "@/components/ui/empty-state";
import type { Review } from "@/lib/supabase/types";

type ReviewWithAuthor = Review & { authorName: string };

/** Two-query merge (reviews, then public_profiles for names) rather than a
 * PostgREST embed — profiles is own-row-only (0005_profile_privacy.sql), so
 * cross-user names only ever come from the curated public_profiles view. */
export function FacilityReviewsList({ trigger, locationId, locationName }: { trigger: React.ReactNode; locationId: string; locationName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithAuthor[] | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: reviewRows } = await supabase
      .from("reviews")
      .select("*")
      .eq("target_type", "facility")
      .eq("target_location_id", locationId)
      .eq("moderation_status", "visible")
      .order("created_at", { ascending: false });

    const rows = reviewRows ?? [];
    const profileIds = [...new Set(rows.map((r) => r.profile_id))];
    const { data: authors } = profileIds.length
      ? await supabase.from("public_profiles").select("id, name, nickname, use_nickname").in("id", profileIds)
      : { data: [] };

    const nameById = new Map((authors ?? []).map((a) => [a.id, a.use_nickname && a.nickname ? a.nickname : a.name]));
    setReviews(rows.map((r) => ({ ...r, authorName: nameById.get(r.profile_id) ?? "A student" })));
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) load();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{locationName} reviews</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !reviews || reviews.length === 0 ? (
          <EmptyState icon={Star} title="No reviews yet" description="Be the first to rate this facility." />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.authorName}</p>
                  <StarRating value={r.rating} size="sm" />
                </div>
                {r.body && <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
