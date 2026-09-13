import { Flame } from "lucide-react";
import { timeGreeting } from "@/lib/utils";

export function GreetingHeader({ name, streak }: { name: string; streak: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <h1 className="display text-[1.6rem] leading-none">
        {timeGreeting()}, {name.split(" ")[0] || "there"}
      </h1>
      {streak > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 py-1 pl-2 pr-3 text-warning">
          <Flame className="size-3.5" />
          <span className="metric-sm text-[0.95rem]">{streak}</span>
          <span className="text-[0.72rem] font-medium">day streak</span>
        </span>
      )}
    </div>
  );
}
