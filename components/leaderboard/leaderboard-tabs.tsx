import { Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmojiReactButton } from "@/components/leaderboard/emoji-react-button";
import { formatNumber, initials, cn } from "@/lib/utils";

export interface LeaderboardRow {
  profileId: string;
  name: string;
  value: number;
  streak?: number;
  isSelf: boolean;
  avatarUrl?: string | null;
}

function Row({ row, index, unit, viewerName }: { row: LeaderboardRow; index: number; unit: string; viewerName: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
        row.isSelf ? "bg-primary/5 ring-1 ring-inset ring-primary/15" : "hover:bg-muted/60"
      )}
    >
      <span
        className={cn(
          "metric-sm w-5 shrink-0 text-center text-[0.95rem]",
          index === 0 ? "text-primary" : "text-muted-foreground"
        )}
      >
        {index + 1}
      </span>
      <Avatar className="size-9">
        <AvatarImage src={row.avatarUrl ?? undefined} alt={row.name} />
        <AvatarFallback>{initials(row.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-[-0.01em]">
          {row.name}
          {row.isSelf && <span className="ml-1 text-muted-foreground">(you)</span>}
        </p>
        {row.streak !== undefined && row.streak > 0 && (
          <p className="text-[0.72rem] text-muted-foreground">
            <span className="tnum">{row.streak}</span>-day streak
          </p>
        )}
      </div>
      <span className="metric-sm shrink-0 text-[0.95rem]">
        {row.value > 0 && unit === "%" ? "+" : ""}
        {unit === "%" ? row.value : formatNumber(row.value)}
        <span className="text-[0.72rem] font-medium text-muted-foreground">{unit}</span>
      </span>
      {!row.isSelf && <EmojiReactButton toProfileId={row.profileId} fromLabel={viewerName} />}
    </div>
  );
}

export function LeaderboardTabs({
  totalActivity,
  improvement,
  viewerName,
  totalUnit = "steps",
  showImprovement = true,
}: {
  totalActivity: LeaderboardRow[];
  improvement: LeaderboardRow[];
  viewerName: string;
  totalUnit?: string;
  showImprovement?: boolean;
}) {
  const totalRows = totalActivity.length === 0 ? (
    <EmptyState icon={Trophy} title="No activity yet" description="Log an activity to appear on the leaderboard." />
  ) : (
    totalActivity.map((row, i) => <Row key={row.profileId} row={row} index={i} unit={` ${totalUnit}`} viewerName={viewerName} />)
  );

  if (!showImprovement) {
    return <div className="space-y-0.5">{totalRows}</div>;
  }

  return (
    <Tabs defaultValue="total">
      <TabsList>
        <TabsTrigger value="total">Total activity</TabsTrigger>
        <TabsTrigger value="improvement">Improvement League</TabsTrigger>
      </TabsList>
      <TabsContent value="total" className="space-y-0.5">
        {totalRows}
      </TabsContent>
      <TabsContent value="improvement" className="space-y-0.5">
        {improvement.length === 0 ? (
          <EmptyState icon={Trophy} title="Not enough history yet" description="Improvement compares this week to last week." />
        ) : (
          improvement.map((row, i) => <Row key={row.profileId} row={row} index={i} unit="%" viewerName={viewerName} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
