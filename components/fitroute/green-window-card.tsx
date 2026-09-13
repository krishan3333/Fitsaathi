import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GreenWindowStatus } from "@/lib/weather";

const STATUS_MAP: Record<GreenWindowStatus, { icon: typeof CircleCheck; tint: string; ring: string; label: string }> = {
  green: { icon: CircleCheck, tint: "text-success bg-success/12", ring: "ring-success/20", label: "Green window: good for outdoor activity" },
  yellow: { icon: CircleAlert, tint: "text-warning bg-warning/12", ring: "ring-warning/20", label: "Yellow window: conditions are borderline" },
  red: { icon: CircleX, tint: "text-danger bg-danger/10", ring: "ring-danger/20", label: "Red window: better to stay indoors" },
};

export function GreenWindowCard({ status, message, tempC, aqi }: { status: GreenWindowStatus; message: string; tempC: number; aqi: number }) {
  const { icon: Icon, tint, ring, label } = STATUS_MAP[status];
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-5">
        <div className="flex items-start gap-3.5">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", tint, ring)}>
            <Icon className="size-[1.15rem]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-[-0.015em]">{label}</p>
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Filled, not bordered: this sits nested inside the Card above, and
              dark mode's border colour is tuned to vanish against the *page*
              (true black) — nested a level deeper, it needs its own fill to
              stay visible against the card's own charcoal. */}
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="metric-sm text-[1.35rem]">
              {Math.round(tempC)}
              <span className="text-[0.85rem] font-medium text-muted-foreground">°C</span>
            </p>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">Temperature</p>
          </div>
          <div className="rounded-2xl bg-muted px-4 py-3">
            <p className="metric-sm text-[1.35rem]">{aqi}</p>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">Air quality index</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
