import { Flame } from "lucide-react";
import { timeGreeting } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function GreetingHeader({ name, streak }: { name: string; streak: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">
          {timeGreeting()}, {name.split(" ")[0] || "there"}
        </h1>
        {streak > 0 && (
          <Badge variant="warning" className="mt-1.5">
            <Flame className="size-3.5" /> {streak}-day active streak
          </Badge>
        )}
      </div>
    </div>
  );
}
