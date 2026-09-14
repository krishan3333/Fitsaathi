import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function CoordinatorLayout({ children }: LayoutProps<"/coordinator">) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6 font-semibold">
          <Link href="/coordinator" className="flex items-center gap-2">
            <LayoutDashboard className="size-5 text-primary" /> Moveup Coordinator
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
