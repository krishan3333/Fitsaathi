import Link from "next/link";
import { Footprints, Plus, MapPinned, Users } from "lucide-react";
import { LogActivityDialog } from "@/components/dashboard/log-activity-dialog";

const TILE =
  "flex w-full flex-col items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <LogActivityDialog
        defaultType="walk"
        trigger={
          <button type="button" className={TILE}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-pink/15 text-accent-pink shadow-xs">
              <Footprints className="size-5" />
            </span>
            <span className="text-[0.8rem] font-semibold leading-tight text-foreground">Log a walk</span>
          </button>
        }
      />
      <Link href="/challenges?create=1" className={TILE}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple shadow-xs">
          <Plus className="size-5" />
        </span>
        <span className="text-[0.8rem] font-semibold leading-tight text-foreground">New challenge</span>
      </Link>
      <Link href="/fitroute" className={TILE}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue shadow-xs">
          <MapPinned className="size-5" />
        </span>
        <span className="text-[0.8rem] font-semibold leading-tight text-foreground">Find a route</span>
      </Link>
      <Link href="/squad" className={TILE}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green shadow-xs">
          <Users className="size-5" />
        </span>
        <span className="text-[0.8rem] font-semibold leading-tight text-foreground">Start a squad</span>
      </Link>
    </div>
  );
}
