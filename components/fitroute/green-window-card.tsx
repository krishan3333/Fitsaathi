import { CircleCheck, CircleAlert, CircleX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GreenWindowStatus } from "@/lib/weather";

const STATUS_MAP: Record<GreenWindowStatus, { icon: typeof CircleCheck; color: string; bg: string; label: string }> = {
  green: { icon: CircleCheck, color: "text-success", bg: "bg-success/10", label: "Green — good for outdoor activity" },
  yellow: { icon: CircleAlert, color: "text-warning", bg: "bg-warning/10", label: "Yellow — caution (weather/AQI)" },
  red: { icon: CircleX, color: "text-danger", bg: "bg-danger/10", label: "Red — avoid outdoor activity" },
};

export function GreenWindowCard({ status, message, tempC, aqi }: { status: GreenWindowStatus; message: string; tempC: number; aqi: number }) {
  const { icon: Icon, color, bg, label } = STATUS_MAP[status];
  return (
    <Card className={cn(bg)}>
      <CardContent className="flex items-start gap-3 py-4">
        <Icon className={cn("size-6 shrink-0", color)} />
        <div>
          <p className={cn("text-sm font-semibold", color)}>{label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
          <p className="mt-1 text-xs text-muted-foreground">{Math.round(tempC)}°C · AQI {aqi}</p>
        </div>
      </CardContent>
    </Card>
  );
}
