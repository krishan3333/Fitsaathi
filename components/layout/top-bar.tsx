"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Trophy, Compass, MapPinned, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/layout/brand-mark";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/quest", label: "Quest", icon: Compass },
  { href: "/fitroute", label: "FitRoute", icon: MapPinned },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

export function TopBar({ profileId }: { profileId?: string }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count ?? 0));
  }, [profileId]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-card/75 backdrop-blur-xl shadow-soft">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 transition-transform duration-200 active:scale-95">
          <div className="transition-transform duration-300 group-hover:scale-105">
            <BrandMark />
          </div>
          <span className="display text-[1.15rem] font-bold tracking-tight text-foreground">Moveup</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-primary/15 text-primary font-semibold shadow-xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 transition-transform duration-200", active && "scale-110")} strokeWidth={active ? 2.3 : 1.9} />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground ring-1 ring-border/50 transition-all duration-200 hover:bg-muted hover:text-foreground hover:ring-border active:scale-95 shadow-xs"
        >
          <Bell className="size-[1.15rem]" />
          {unread > 0 && (
            <span className="absolute right-2 top-2 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary ring-2 ring-card" />
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
