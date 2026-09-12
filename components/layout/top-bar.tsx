"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Trophy, Compass, MapPinned, CircleUser, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Dumbbell className="size-4" />
          </span>
          FitSaathi
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>

        <Link href="/notifications" className="relative flex size-9 items-center justify-center rounded-full hover:bg-muted">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-danger" />
          )}
        </Link>
      </div>
    </header>
  );
}
