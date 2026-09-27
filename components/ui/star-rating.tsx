"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Both an input (onChange set) and a read-only display (onChange omitted). */
export function StarRating({ value, onChange, size = "default" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "default" }) {
  const iconClass = size === "sm" ? "size-3.5" : "size-6";
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange?.(n)}
          className={cn("transition-transform", onChange && "cursor-pointer hover:scale-110 active:scale-95")}
        >
          <Star className={cn(iconClass, n <= value ? "fill-warning text-warning" : "fill-transparent text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}
