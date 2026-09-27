import { FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_VARIANT, TARGET_TYPE_LABELS } from "@/lib/reports";
import type { Complaint } from "@/lib/supabase/types";

export function MyReportsList({ complaints }: { complaints: Complaint[] }) {
  if (complaints.length === 0) {
    return <EmptyState icon={FileWarning} title="No reports filed" description="Use “Report an issue” to flag a problem with a facility, coach or event." />;
  }

  return (
    <div className="space-y-2">
      {complaints.map((c) => (
        <Card key={c.id}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold tracking-[-0.015em]">{c.target_label}</h3>
                <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
                  {TARGET_TYPE_LABELS[c.target_type]} · {COMPLAINT_CATEGORY_LABELS[c.category]} · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={COMPLAINT_STATUS_VARIANT[c.status]} className="shrink-0">
                {COMPLAINT_STATUS_LABELS[c.status]}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            {c.admin_notes && (
              <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
                <p className="font-medium">Coordinator note</p>
                <p className="mt-0.5 text-muted-foreground">{c.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
