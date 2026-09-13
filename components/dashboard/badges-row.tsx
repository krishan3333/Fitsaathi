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

// Rotates through the metric accent hues rather than one colour for every
// badge — a shelf of medals, each its own, the way the reference's Awards
// tile stacks distinct enamel colours rather than repeating one.
const TILE_TONES = [
  "bg-accent-orange/14 text-accent-orange ring-accent-orange/25",
  "bg-accent-pink/14 text-accent-pink ring-accent-pink/25",
  "bg-accent-blue/14 text-accent-blue ring-accent-blue/25",
  "bg-accent-purple/14 text-accent-purple ring-accent-purple/25",
  "bg-accent-green/14 text-accent-green ring-accent-green/25",
];

export function BadgesRow({ badges }: { badges: { name: string; icon: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent badges</CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <EmptyState icon={Award} title="No badges yet" description="Finish quests and challenges to start earning them." />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-none">
            {badges.map((b, i) => {
              const Icon = ICONS[b.icon] ?? Award;
              return (
                <div key={b.name} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-2 text-center">
                  <div className={`flex size-12 items-center justify-center rounded-2xl ring-1 ring-inset ${TILE_TONES[i % TILE_TONES.length]}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[0.7rem] font-medium leading-tight">{b.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
