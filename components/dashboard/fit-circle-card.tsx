import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/utils";

export function FitCircleCard({
  circle,
}: {
  circle: { name: string; current: number; goal: number; challengeId: string } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" /> Fit Circle
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!circle ? (
          <EmptyState
            icon={Users}
            title="No Fit Circle yet"
            description="Create one or join with a code to take on challenges together."
            action={
              <Button asChild size="sm">
                <Link href="/challenges">Get started</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-semibold tracking-[-0.01em]">{circle.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted-foreground">
                  <span className="metric-sm text-foreground">{formatNumber(circle.current)}</span> of{" "}
                  {formatNumber(circle.goal)} team steps
                </p>
              </div>
              <span className="metric-sm text-accent-green shrink-0 text-[1.25rem]">
                {Math.round((circle.current / circle.goal) * 100)}
                <span className="text-[0.8rem] font-medium text-muted-foreground">%</span>
              </span>
            </div>
            <Progress value={(circle.current / circle.goal) * 100} indicatorClassName="bg-accent-green" className="mt-3" />
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={`/challenges/${circle.challengeId}`}>
                View leaderboard <ArrowRight />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
