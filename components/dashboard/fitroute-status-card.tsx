import Link from "next/link";
import { CircleCheck, CircleAlert, CircleX, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GreenWindowStatus } from "@/lib/weather";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  green: { icon: CircleCheck, tint: "text-success bg-success/12 ring-success/20", label: "Good time to be outside" },
  yellow: { icon: CircleAlert, tint: "text-warning bg-warning/12 ring-warning/20", label: "Conditions are borderline" },
  red: { icon: CircleX, tint: "text-danger bg-danger/10 ring-danger/20", label: "Better to stay indoors" },
} as const;

export function FitRouteStatusCard({
  status,
  bestNearby,
}: {
  status: GreenWindowStatus;
  bestNearby: { name: string; distanceKm: number } | null;
}) {
  const { icon: Icon, tint, label } = STATUS_MAP[status];
  return (
    <Link href="/fitroute" className="group block">
      <Card className="transition-[border-color,box-shadow] group-hover:border-foreground/20 group-hover:shadow-lift">
        <CardContent className="flex items-center gap-3.5 py-4">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", tint)}>
            <Icon className="size-[1.15rem]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tracking-[-0.01em]">{label}</p>
            {bestNearby && (
              <p className="mt-0.5 truncate text-[0.78rem] text-muted-foreground">
                Nearest route: {bestNearby.name} · <span className="tnum">{bestNearby.distanceKm}</span> km
              </p>
            )}
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
