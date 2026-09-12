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
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
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
    <div className="overflow-x-auto">
      <table className="w-full text-center text-sm">
        <thead>
          <tr>
            <th />
            {DAYS.map((d) => (
              <th key={d} className="pb-2 font-medium text-muted-foreground">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_BUCKETS.map((b) => (
            <tr key={b.label}>
              <td className="pr-2 text-right text-xs text-muted-foreground">{b.label}</td>
              {DAYS.map((d) => {
                const key = slotKey(d, b.label);
                const active = value.has(key);
                return (
                  <td key={key} className="p-1">
                    <button
                      type="button"
                      aria-label={`${d} ${b.label}`}
                      aria-pressed={active}
                      onClick={() => toggle(d, b.label)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
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
