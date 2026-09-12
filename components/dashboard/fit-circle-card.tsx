import Link from "next/link";
import { Users } from "lucide-react";
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
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" /> Fit Circle
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!circle ? (
          <EmptyState
            icon={Users}
            title="No Fit Circle yet"
            description="Create or join one to compete with friends."
            action={
              <Button asChild size="sm">
                <Link href="/challenges">Get started</Link>
              </Button>
            }
          />
        ) : (
          <>
            <p className="font-medium">{circle.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatNumber(circle.current)} / {formatNumber(circle.goal)} team steps
            </p>
            <Progress value={(circle.current / circle.goal) * 100} indicatorClassName="bg-success" className="mt-3" />
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={`/challenges/${circle.challengeId}`}>View Leaderboard</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
