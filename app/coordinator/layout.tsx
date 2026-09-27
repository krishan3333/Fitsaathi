import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function CoordinatorLayout({ children }: LayoutProps<"/coordinator">) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-6">
          <Link href="/coordinator" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="size-5 text-primary" /> Moveup Coordinator
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/coordinator/complaints" className="hover:text-foreground">
              Complaints
            </Link>
            <Link href="/coordinator/reviews" className="hover:text-foreground">
              Reviews
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
