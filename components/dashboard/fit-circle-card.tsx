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
  const pct = circle ? Math.min(100, Math.round((circle.current / circle.goal) * 100)) : 0;
  return (
    <Card className="border-accent-green/20 bg-gradient-to-br from-card to-accent-green/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <div className="rounded-lg bg-accent-green/15 p-1 text-accent-green">
            <Users className="size-4" />
          </div>
          Fit Circle
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
                <p className="font-bold text-[1.05rem] text-foreground">{circle.name}</p>
                <p className="mt-1 text-[0.78rem] text-muted-foreground font-medium">
                  <span className="metric-sm text-foreground font-bold">{formatNumber(circle.current)}</span> of{" "}
                  {formatNumber(circle.goal)} team steps
                </p>
              </div>
              <span className="metric-sm text-accent-green shrink-0 text-[1.4rem] font-bold">
                {pct}
                <span className="text-[0.8rem] font-semibold text-muted-foreground">%</span>
              </span>
            </div>
            <Progress value={pct} indicatorClassName="bg-accent-green" className="mt-3.5 h-2 rounded-full" />
            <Button asChild variant="outline" size="sm" className="mt-4.5 w-full shadow-xs font-semibold hover:bg-accent-green/10 hover:text-accent-green hover:border-accent-green/30">
              <Link href={`/challenges/${circle.challengeId}`}>
                View leaderboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
