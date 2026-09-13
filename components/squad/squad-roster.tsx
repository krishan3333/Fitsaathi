import { Crown, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import type { SquadProgress } from "@/lib/use-squad-channel";

export interface RosterMember {
  profileId: string;
  name: string;
  avatarUrl: string | null;
}

export function SquadRoster({
  members,
  onlineIds,
  hostId,
  progress,
}: {
  members: RosterMember[];
  onlineIds: string[];
  hostId: string;
  progress?: Record<string, SquadProgress>;
}) {
  const onlineSet = new Set(onlineIds);
  return (
    <div className="space-y-1.5">
      {members.map((m) => {
        const online = onlineSet.has(m.profileId);
        const p = progress?.[m.profileId];
        return (
          <div key={m.profileId} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <Avatar>
              <AvatarImage src={m.avatarUrl ?? undefined} alt={m.name} />
              <AvatarFallback>{initials(m.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {m.name}
                {m.profileId === hostId && <Crown className="size-3.5 text-warning" />}
              </p>
              {p && <p className="text-xs text-muted-foreground">{p.distanceKm.toFixed(2)} km · {p.steps} steps</p>}
            </div>
            {online ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}
