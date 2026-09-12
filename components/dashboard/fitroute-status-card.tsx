import Link from "next/link";
import { CircleCheck, CircleAlert, CircleX, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GreenWindowStatus } from "@/lib/weather";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  green: { icon: CircleCheck, color: "text-success", label: "Good time for outdoor activity" },
  yellow: { icon: CircleAlert, color: "text-warning", label: "Caution — conditions are borderline" },
  red: { icon: CircleX, color: "text-danger", label: "Avoid outdoor activity right now" },
} as const;

export function FitRouteStatusCard({
  status,
  bestNearby,
}: {
  status: GreenWindowStatus;
  bestNearby: { name: string; distanceKm: number } | null;
}) {
  const { icon: Icon, color, label } = STATUS_MAP[status];
  return (
    <Link href="/fitroute">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Icon className={cn("size-6 shrink-0", color)} />
            <div>
              <p className="text-sm font-medium">{label}</p>
              {bestNearby && (
                <p className="text-xs text-muted-foreground">
                  Best nearby: {bestNearby.name} — {bestNearby.distanceKm} km
                </p>
              )}
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
