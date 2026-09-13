import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

const DAILY_STEP_GOAL = 8000;
const WEEKLY_ACTIVE_DAY_GOAL = 5;

/** A small grid of single-metric tiles, each its own colour — the same
 * language as a Fitness-app summary screen: one glance, several hues, no
 * label repeated twice. The ring card is the "goal" metric and gets the
 * primary pink; the two supporting tiles get their own accent apiece so nothing
 * blends into the next thing. */
export function StepProgressCard({
  steps,
  activeMinutes,
  activeDays,
}: {
  steps: number;
  activeMinutes: number;
  activeDays: number;
}) {
  const daysHit = Math.min(activeDays, WEEKLY_ACTIVE_DAY_GOAL);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="col-span-2 shadow-lift sm:col-span-1">
        <CardContent className="flex items-center gap-6 py-6">
          <ProgressRing value={steps} max={DAILY_STEP_GOAL} indicatorClassName="stroke-accent-pink" size={140} strokeWidth={9} className="shrink-0">
            <div className="flex flex-col items-center pb-0.5">
              <span className="metric text-accent-pink text-[1.9rem]">{formatNumber(steps)}</span>
            </div>
          </ProgressRing>
          <div>
            <p className="text-[0.78rem] font-medium">Steps today</p>
            <p className="mt-0.5 text-[0.72rem] text-muted-foreground">of {formatNumber(DAILY_STEP_GOAL)} goal</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-[0.78rem] font-medium">Active minutes</p>
          <p className="mt-2 text-[0.68rem] text-muted-foreground">Today</p>
          <p className="metric text-accent-blue mt-1 text-[2rem]">
            {activeMinutes}
            <span className="ml-1 text-[0.75rem] font-medium text-muted-foreground">min</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-[0.78rem] font-medium">Active days</p>
          <p className="mt-2 text-[0.68rem] text-muted-foreground">This week</p>
          <p className="metric text-accent-purple mt-1 text-[2rem]">
            {daysHit}
            <span className="ml-1 text-[0.85rem] font-medium text-muted-foreground">/{WEEKLY_ACTIVE_DAY_GOAL}</span>
          </p>
          <Progress value={(daysHit / WEEKLY_ACTIVE_DAY_GOAL) * 100} indicatorClassName="bg-accent-purple" className="mt-2.5 h-1" />
        </CardContent>
      </Card>
    </div>
  );
}
