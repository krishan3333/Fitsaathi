import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { VERIFIED_REASON_LABELS } from "@/lib/squad";
import type { SquadFinalizeResult } from "@/lib/use-squad-channel";
import type { SquadVerifiedReason } from "@/lib/supabase/types";
import type { RosterMember } from "@/components/squad/squad-roster";

export function SquadSummary({ results, members }: { results: SquadFinalizeResult[]; members: RosterMember[] }) {
  const byId = new Map(members.map((m) => [m.profileId, m]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Session results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.map((r) => {
          const member = byId.get(r.profileId);
          return (
            <div key={r.profileId} className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <Avatar>
                <AvatarImage src={member?.avatarUrl ?? undefined} alt={member?.name ?? ""} />
                <AvatarFallback>{initials(member?.name ?? "?")}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{member?.name ?? "Squad member"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.distanceKm.toFixed(2)} km · {r.steps} steps · {r.activeMinutes} min
                </p>
              </div>
              {r.verified ? (
                <Badge variant="success">
                  <CheckCircle2 className="size-3" /> Peer-verified
                </Badge>
              ) : (
                <Badge variant="warning">
                  <XCircle className="size-3" /> {VERIFIED_REASON_LABELS[r.verifiedReason as SquadVerifiedReason] ?? "Not verified"}
                </Badge>
              )}
            </div>
          );
        })}
        <Button asChild className="mt-2 w-full" variant="outline">
          <Link href="/squad">Back to Squad hub</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
