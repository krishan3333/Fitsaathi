"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EMOJIS = ["🔥", "💪", "👏", "🚀", "😮"];

export function EmojiReactButton({ toProfileId, fromLabel }: { toProfileId: string; fromLabel: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function react(emoji: string) {
    setSent(emoji);
    setOpen(false);
    const supabase = createClient();
    await supabase.from("notifications").insert({
      profile_id: toProfileId,
      title: "Someone reacted to your progress",
      body: `${fromLabel} sent ${emoji}`,
      type: "reaction",
    });
  }

  if (sent) return <span className="text-base">{sent}</span>;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        aria-label="React"
      >
        <SmilePlus className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 flex gap-0.5 rounded-full border border-border bg-card p-1 shadow-md">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => react(e)}
              className={cn("flex size-7 items-center justify-center rounded-full text-base hover:bg-muted")}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
