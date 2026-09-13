import Link from "next/link";
import { Sun, CloudSun, CloudRain, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSlotTime, hhmmToMinutes, localClock } from "@/lib/time";
import type { FitWindow } from "@/lib/fit-window";

const STATUS_STYLE = {
  green: { icon: Sun, badge: "success" as const, label: "Good", bar: "bg-success", dot: "bg-success" },
  yellow: { icon: CloudSun, badge: "warning" as const, label: "Okay", bar: "bg-warning", dot: "bg-warning" },
  red: { icon: CloudRain, badge: "danger" as const, label: "Indoor better", bar: "bg-danger", dot: "bg-danger" },
};

// The rail spans a student's realistic waking range; anything outside just
// clamps to the ends rather than distorting the scale.
const RAIL_START = 5 * 60;
const RAIL_END = 23 * 60;
const RAIL_SPAN = RAIL_END - RAIL_START;
const TICKS = [6 * 60, 10 * 60, 14 * 60, 18 * 60, 22 * 60];

function railPct(minutes: number) {
  const clamped = Math.min(Math.max(minutes, RAIL_START), RAIL_END);
  return ((clamped - RAIL_START) / RAIL_SPAN) * 100;
}

function tickLabel(minutes: number) {
  const hour = minutes / 60;
  const suffix = hour >= 12 ? "p" : "a";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${suffix}`;
}

/** Today's free time, drawn as the day itself: position is when, width is how
 * long, colour is what the air and weather are doing. The list underneath
 * carries the detail — the rail is there so the shape of the day reads in one
 * glance. */
export function FitWindowsCard({
  windows,
  compact = false,
  highlight,
}: {
  windows: FitWindow[];
  compact?: boolean;
  /** `${start}-${end}` of a window a nudge pointed at (via /quest?window=…) — rings it. */
  highlight?: string;
}) {
  if (windows.length === 0) {
    return compact ? null : (
      <Card>
        <CardHeader>
          <CardTitle>Your day</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Sun}
            title="No free windows today"
            description="Add your free slots in Profile and we'll find the gaps worth moving in."
          />
        </CardContent>
      </Card>
    );
  }

  const now = localClock();
  const nowInRail = now.minutes >= RAIL_START && now.minutes <= RAIL_END;

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-3">
        <CardTitle>Your day</CardTitle>
        <span className="text-[0.72rem] text-muted-foreground">
          {windows.length} free {windows.length === 1 ? "window" : "windows"}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="relative h-10 overflow-hidden rounded-xl bg-muted">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute top-0 h-full w-px bg-border"
                style={{ left: `${railPct(t)}%` }}
                aria-hidden="true"
              />
            ))}

            {windows.map((w) => {
              const { bar } = STATUS_STYLE[w.status];
              const left = railPct(hhmmToMinutes(w.start));
              const right = railPct(hhmmToMinutes(w.end));
              const key = `${w.start}-${w.end}`;
              return (
                <span
                  key={key}
                  className={`absolute top-1.5 h-7 rounded-md ${bar} ${key === highlight ? "ring-2 ring-foreground/40" : ""}`}
                  style={{ left: `${left}%`, width: `${Math.max(right - left, 1.5)}%` }}
                  title={`${formatSlotTime(w.start)} – ${formatSlotTime(w.end)}`}
                />
              );
            })}

            {nowInRail && (
              <span
                className="absolute top-0 h-full w-0.5 bg-foreground"
                style={{ left: `${railPct(now.minutes)}%` }}
                aria-hidden="true"
              >
                <span className="absolute -left-[3px] -top-[3px] size-2 rounded-full bg-foreground" />
              </span>
            )}
          </div>

          <div className="relative mt-1.5 h-3">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 text-[0.65rem] tabular-nums text-muted-foreground"
                style={{ left: `${railPct(t)}%` }}
              >
                {tickLabel(t)}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {windows.map((w) => {
            const { badge, label, dot } = STATUS_STYLE[w.status];
            const key = `${w.start}-${w.end}`;
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
                  key === highlight ? "border-primary bg-primary/5" : "border-transparent bg-muted"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2">
                    <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                    <span className="metric-sm text-[0.95rem]">
                      {formatSlotTime(w.start)} – {formatSlotTime(w.end)}
                    </span>
                    <span className="shrink-0 text-[0.72rem] text-muted-foreground">{w.minutes} min</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={badge}>{label}</Badge>
                    {w.aqi != null && <Badge variant="muted">AQI {w.aqi}</Badge>}
                    {w.friends.length > 0 && (
                      <Badge variant="default">
                        <Users /> {w.friends.slice(0, 2).join(", ")}
                        {w.friends.length > 2 ? ` +${w.friends.length - 2}` : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                {!compact && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/quest?window=${w.start}-${w.end}`}>Start</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
