"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

export function SignOutButton({
  variant = "outline",
  size = "default",
  className,
  children,
}: VariantProps<typeof buttonVariants> & { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={signOut} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <LogOut />}
      {children ?? "Sign out"}
    </Button>
  );
}
