import Link from "next/link";
import { Footprints, Plus, MapPinned, Users } from "lucide-react";
import { LogActivityDialog } from "@/components/dashboard/log-activity-dialog";

const TILE =
  "flex w-full flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 text-left transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-foreground/20 hover:shadow-lift active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ICON_WRAP = "flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary";
const LABEL = "text-[0.78rem] font-medium leading-tight";

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <LogActivityDialog
        defaultType="walk"
        trigger={
          <button type="button" className={TILE}>
            <span className={ICON_WRAP}>
              <Footprints className="size-[1.15rem]" />
            </span>
            <span className={LABEL}>Log a walk</span>
          </button>
        }
      />
      <Link href="/challenges?create=1" className={TILE}>
        <span className={ICON_WRAP}>
          <Plus className="size-[1.15rem]" />
        </span>
        <span className={LABEL}>New challenge</span>
      </Link>
      <Link href="/fitroute" className={TILE}>
        <span className={ICON_WRAP}>
          <MapPinned className="size-[1.15rem]" />
        </span>
        <span className={LABEL}>Find a route</span>
      </Link>
      <Link href="/squad" className={TILE}>
        <span className={ICON_WRAP}>
          <Users className="size-[1.15rem]" />
        </span>
        <span className={LABEL}>Start a squad</span>
      </Link>
    </div>
  );
}
