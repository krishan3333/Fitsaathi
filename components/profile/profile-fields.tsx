"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, TIME_BUCKETS } from "@/lib/profile-options";
import type { FreeSlot } from "@/lib/supabase/types";

/** Selectable pill used across onboarding and profile editing. */
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-4 py-2 text-[0.82rem] font-medium transition-[background-color,border-color,color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function slotKey(day: string, bucketLabel: string) {
  return `${day}:${bucketLabel}`;
}

export function slotsToKeys(slots: FreeSlot[]): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    const bucket = TIME_BUCKETS.find((b) => b.start === slot.start && b.end === slot.end);
    if (bucket) keys.add(slotKey(slot.day, bucket.label));
  }
  return keys;
}

export function keysToSlots(keys: Set<string>): FreeSlot[] {
  return [...keys].map((key) => {
    const [day, bucketLabel] = key.split(":");
    const bucket = TIME_BUCKETS.find((b) => b.label === bucketLabel)!;
    return { day, start: bucket.start, end: bucket.end };
  });
}

/** Weekly grid of free-time slots — feeds the quest planner's timetable rules. */
export function FreeSlotPicker({ value, onChange }: { value: Set<string>; onChange: (next: Set<string>) => void }) {
  function toggle(day: string, bucketLabel: string) {
    const key = slotKey(day, bucketLabel);
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-muted/60 p-3">
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            <th />
            {DAYS.map((d) => (
              <th key={d} className="pb-2 text-[0.7rem] font-medium text-muted-foreground">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_BUCKETS.map((b) => (
            <tr key={b.label}>
              <td className="py-0.5 pr-2.5 text-right text-[0.68rem] leading-tight text-muted-foreground">{b.label}</td>
              {DAYS.map((d) => {
                const key = slotKey(d, b.label);
                const active = value.has(key);
                return (
                  <td key={key} className="p-[3px]">
                    <button
                      type="button"
                      aria-label={`${d} ${b.label}`}
                      aria-pressed={active}
                      onClick={() => toggle(d, b.label)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-[0.55rem] transition-[background-color,transform] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-border"
                      )}
                    >
                      {active && <Check className="size-3.5" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
