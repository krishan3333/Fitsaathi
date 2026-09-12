import { Footprints } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

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
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center sm:justify-around">
        <ProgressRing value={steps} max={DAILY_STEP_GOAL}>
          <div className="flex flex-col items-center">
            <Footprints className="mb-1 size-5 text-success" />
            <span className="text-xl font-bold leading-none">{formatNumber(steps)}</span>
            <span className="text-xs text-muted-foreground">/ {formatNumber(DAILY_STEP_GOAL)} steps</span>
          </div>
        </ProgressRing>

        <div className="w-full max-w-xs space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Active minutes today</span>
            <span className="font-semibold">{activeMinutes} min</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weekly goal</span>
              <span className="font-medium">
                {Math.min(activeDays, WEEKLY_ACTIVE_DAY_GOAL)} / {WEEKLY_ACTIVE_DAY_GOAL} active days
              </span>
            </div>
            <Progress value={(Math.min(activeDays, WEEKLY_ACTIVE_DAY_GOAL) / WEEKLY_ACTIVE_DAY_GOAL) * 100} indicatorClassName="bg-success" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
