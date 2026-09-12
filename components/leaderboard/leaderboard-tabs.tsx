import { Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmojiReactButton } from "@/components/leaderboard/emoji-react-button";
import { formatNumber, initials, cn } from "@/lib/utils";

export interface LeaderboardRow {
  profileId: string;
  name: string;
  value: number;
  streak?: number;
  isSelf: boolean;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function Row({ row, index, unit, viewerName }: { row: LeaderboardRow; index: number; unit: string; viewerName: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", row.isSelf && "bg-primary/5")}>
      <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">{MEDALS[index] ?? index + 1}</span>
      <Avatar className="size-9">
        <AvatarFallback>{initials(row.name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{row.name}{row.isSelf && " (You)"}</p>
        {row.streak !== undefined && row.streak > 0 && (
          <p className="text-xs text-muted-foreground">{row.streak}-day streak</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold">
        {row.value > 0 && unit === "%" ? "+" : ""}
        {unit === "%" ? row.value : formatNumber(row.value)}
        {unit}
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
        <TabsTrigger value="total">Total Activity</TabsTrigger>
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
