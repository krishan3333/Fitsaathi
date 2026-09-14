"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, X, Send, Loader2, SquarePlay } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  videoQueries?: string[];
  isError?: boolean;
}

const GREETING: ChatMessage = {
  role: "model",
  text: "Hey, I'm your FitSaathi Buddy! Ask me for workout tips, form pointers, or just say hi — I'll point you to a video when it helps.",
};

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Mounted once in the (app) shell layout, so it survives navigation between
 * pages inside that segment — the chat history isn't lost when you tap around. */
export function FloatingAiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user", text } as ChatMessage];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // First entry in `next` is always the local-only greeting — never send it upstream.
        body: JSON.stringify({ messages: next.slice(1).map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong");
      setMessages((cur) => [...cur, { role: "model", text: data.reply, videoQueries: data.videoQueries }]);
    } catch (error) {
      setMessages((cur) => [
        ...cur,
        { role: "model", text: error instanceof Error ? error.message : "Buddy is unavailable right now.", isError: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-x-4 bottom-[9.5rem] z-50 flex max-h-[65vh] flex-col overflow-hidden rounded-[1.5rem] bg-card shadow-float ring-1 ring-foreground/8 animate-fade-in sm:inset-x-auto sm:right-4 sm:w-[23rem] md:bottom-24">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-[-0.01em]">FitSaathi Buddy</p>
                <p className="text-[11px] text-muted-foreground">Tips, videos &amp; chat</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : m.isError ? "bg-danger/10 text-danger" : "bg-muted text-foreground"
                  )}
                >
                  <p>{m.text}</p>
                  {m.videoQueries && m.videoQueries.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 border-t border-foreground/10 pt-2">
                      {m.videoQueries.map((q) => (
                        <a
                          key={q}
                          href={youtubeSearchUrl(q)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
                        >
                          <SquarePlay className="size-3.5 shrink-0" />
                          {q}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-3.5 py-2.5 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span className="text-[12.5px]">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for tips, a video, or just chat…"
              maxLength={600}
              className="h-10 flex-1 rounded-full bg-muted px-4 text-[13.5px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[5.75rem] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-accent-purple text-primary-foreground shadow-float ring-2 ring-white/20 transition-all duration-300 hover:scale-110 active:scale-95 md:bottom-6 group"
        aria-label={open ? "Close FitSaathi Buddy" : "Open FitSaathi Buddy"}
      >
        {open ? (
          <X className="size-6 transition-transform group-hover:rotate-90" />
        ) : (
          <Sparkles className="size-6 animate-pulse-soft text-yellow-200" />
        )}
      </button>
    </>
  );
}
