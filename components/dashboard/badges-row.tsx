import { Award, Flame, Footprints, Star, Sun, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  footprints: Footprints,
  star: Star,
  users: Users,
  sun: Sun,
  flame: Flame,
};

export function BadgesRow({ badges }: { badges: { name: string; icon: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent badges</CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <EmptyState icon={Award} title="No badges yet" description="Complete quests and challenges to start earning them." />
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none">
            {badges.map((b) => {
              const Icon = ICONS[b.icon] ?? Award;
              return (
                <div key={b.name} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-warning/15">
                    <Icon className="size-6 text-warning" />
                  </div>
                  <span className="w-16 text-xs font-medium leading-tight">{b.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
