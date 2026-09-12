import Link from "next/link";
import { Footprints, Plus, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogActivityDialog } from "@/components/dashboard/log-activity-dialog";

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <LogActivityDialog
        defaultType="walk"
        trigger={
          <Button variant="outline" className="h-auto w-full flex-col gap-1.5 py-3">
            <Footprints className="size-5 text-primary" />
            <span className="text-xs">Track Walk</span>
          </Button>
        }
      />
      <Button variant="outline" className="h-auto w-full flex-col gap-1.5 py-3" asChild>
        <Link href="/challenges?create=1">
          <Plus className="size-5 text-primary" />
          <span className="text-xs">Create Challenge</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto w-full flex-col gap-1.5 py-3" asChild>
        <Link href="/fitroute">
          <MapPinned className="size-5 text-primary" />
          <span className="text-xs">Find Route</span>
        </Link>
      </Button>
    </div>
  );
}
