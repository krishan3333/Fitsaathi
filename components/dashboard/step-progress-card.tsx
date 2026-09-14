import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";
import { Footprints, Zap, CalendarCheck } from "lucide-react";

const DAILY_STEP_GOAL = 8000;
const WEEKLY_ACTIVE_DAY_GOAL = 5;

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
  const stepsPct = Math.min(100, Math.round((steps / DAILY_STEP_GOAL) * 100));

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="col-span-2 shadow-lift sm:col-span-1 border-primary/20 bg-gradient-to-br from-card via-card to-accent-pink/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Footprints className="size-24 text-accent-pink" />
        </div>
        <CardContent className="flex items-center gap-6 py-6 relative z-10">
          <ProgressRing value={steps} max={DAILY_STEP_GOAL} indicatorClassName="stroke-accent-pink" size={135} strokeWidth={10} className="shrink-0">
            <div className="flex flex-col items-center pb-0.5">
              <span className="metric text-accent-pink text-[1.85rem] font-black">{formatNumber(steps)}</span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">{stepsPct}%</span>
            </div>
          </ProgressRing>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-accent-pink">
              <Footprints className="size-4" />
              <p className="text-[0.8rem] font-bold uppercase tracking-wide">Steps today</p>
            </div>
            <p className="text-[0.78rem] text-muted-foreground font-medium">Goal: {formatNumber(DAILY_STEP_GOAL)}</p>
            <div className="pt-1">
              <span className="inline-block rounded-full bg-accent-pink/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-accent-pink">
                {steps >= DAILY_STEP_GOAL ? "Goal Achieved! 🎉" : `${formatNumber(DAILY_STEP_GOAL - steps)} left`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent-blue/20 bg-gradient-to-br from-card to-accent-blue/5">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.8rem] font-bold uppercase tracking-wide text-accent-blue">Active mins</p>
            <div className="rounded-xl bg-accent-blue/15 p-1.5 text-accent-blue">
              <Zap className="size-4" />
            </div>
          </div>
          <p className="metric text-accent-blue mt-3 text-[2.1rem]">
            {activeMinutes}
            <span className="ml-1 text-[0.8rem] font-semibold text-muted-foreground">min</span>
          </p>
          <p className="mt-1 text-[0.72rem] font-medium text-muted-foreground">Daily exercise time</p>
        </CardContent>
      </Card>

      <Card className="border-accent-purple/20 bg-gradient-to-br from-card to-accent-purple/5">
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <p className="text-[0.8rem] font-bold uppercase tracking-wide text-accent-purple">Active days</p>
            <div className="rounded-xl bg-accent-purple/15 p-1.5 text-accent-purple">
              <CalendarCheck className="size-4" />
            </div>
          </div>
          <p className="metric text-accent-purple mt-3 text-[2.1rem]">
            {daysHit}
            <span className="ml-1 text-[0.85rem] font-semibold text-muted-foreground">/{WEEKLY_ACTIVE_DAY_GOAL}</span>
          </p>
          <Progress value={(daysHit / WEEKLY_ACTIVE_DAY_GOAL) * 100} indicatorClassName="bg-accent-purple" className="mt-3 h-1.5 rounded-full" />
        </CardContent>
      </Card>
    </div>
  );
}
