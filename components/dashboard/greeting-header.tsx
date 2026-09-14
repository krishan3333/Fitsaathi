import { Flame, Sparkles } from "lucide-react";
import { timeGreeting } from "@/lib/utils";

export function GreetingHeader({ name, streak }: { name: string; streak: number }) {
  const firstName = name.split(" ")[0] || "there";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
      <div className="flex items-center gap-3">
        <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent-purple/20 text-primary ring-1 ring-primary/30 shadow-soft">
          <span className="display text-lg font-bold">{firstName[0]?.toUpperCase() || "F"}</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">Student Portal</span>
            <Sparkles className="size-3 text-primary animate-pulse-soft" />
          </div>
          <h1 className="display text-[1.75rem] font-bold leading-tight text-foreground">
            {timeGreeting()}, <span className="gradient-text-primary">{firstName}</span>
          </h1>
        </div>
      </div>

      {streak > 0 && (
        <div className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3.5 py-1.5 text-warning shadow-soft backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-warning/15">
          <Flame className="size-4 animate-pulse-soft fill-warning/20" />
          <span className="metric-sm text-[1rem] font-bold">{streak}</span>
          <span className="text-[0.75rem] font-semibold text-warning/90">day streak</span>
        </div>
      )}
    </div>
  );
}
