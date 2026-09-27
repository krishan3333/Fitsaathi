"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState } from "@/components/ui/empty-state";
import { TARGET_TYPE_LABELS } from "@/lib/reports";
import type { Review } from "@/lib/supabase/types";

export function MyReviewsList({ reviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [items, setItems] = useState(reviews);

  async function remove(id: string) {
    setItems((r) => r.filter((x) => x.id !== id));
    const supabase = createClient();
    await supabase.from("reviews").delete().eq("id", id);
    router.refresh();
  }

  if (items.length === 0) {
    return <EmptyState icon={Star} title="No reviews yet" description="Rate a facility from FitRoute, or a coach from here." />;
  }

  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold tracking-[-0.015em]">{r.target_label}</h3>
                <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
                  {TARGET_TYPE_LABELS[r.target_type]} · {new Date(r.created_at).toLocaleDateString()}
                  {r.moderation_status === "hidden" && " · Hidden by a coordinator"}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete review">
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
            <div className="mt-2">
              <StarRating value={r.rating} size="sm" />
            </div>
            {r.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>}
            {r.moderation_status === "hidden" && r.moderation_reason && <p className="mt-2 text-sm text-danger">Reason: {r.moderation_reason}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
