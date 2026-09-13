"use client";

import { EMOJIS } from "@/components/leaderboard/emoji-react-button";
import type { SquadReaction } from "@/lib/use-squad-channel";

/** Live reaction picker + a scrolling feed of what's come in over the
 * broadcast channel — a lighter-weight version of emoji-react-button.tsx's
 * picker (no server round-trip needed, it's just a broadcast). */
export function SquadReactions({ onReact, recent }: { onReact: (emoji: string) => void; recent: SquadReaction[] }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onReact(e)}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-lg hover:bg-muted"
          >
            {e}
          </button>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 text-lg">
          {recent.slice(-10).map((r, i) => (
            <span key={`${r.profileId}-${r.at}-${i}`} className="animate-pulse-soft">
              {r.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
