"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SquadJoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_squad_by_code", { p_code: code });
    setLoading(false);
    const session = data?.[0];
    if (error || !session) {
      setError(error?.message ?? "No active squad session found with that code.");
      return;
    }
    router.push(`/squad/${session.id}`);
  }

  return (
    <div className="space-y-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Join code"
        className="text-center font-mono uppercase tracking-widest"
        maxLength={6}
      />
      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <Button className="w-full" disabled={loading || !code.trim()} onClick={join}>
        {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
        Join squad
      </Button>
    </div>
  );
}
