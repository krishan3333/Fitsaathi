"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Compass, MapPinned, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/quest", label: "Quest", icon: Compass },
  { href: "/fitroute", label: "FitRoute", icon: MapPinned },
  { href: "/profile", label: "Profile", icon: CircleUser },
];

/** Floats clear of the page edge rather than sitting as a full-width bar —
 * the content scrolls under it, which keeps the small screen feeling like a
 * single surface instead of a stack of chrome. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between gap-1 rounded-full bg-card/85 p-1.5 shadow-float ring-1 ring-border/60 backdrop-blur-xl">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-full py-2 text-[10.5px] font-medium transition-all duration-200 active:scale-95",
                  active
                    ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/25 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-[1.15rem] transition-transform duration-200", active && "scale-110")} strokeWidth={active ? 2.3 : 1.9} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
