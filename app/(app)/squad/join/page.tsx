import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ui/empty-state";
import { SquadJoinForm } from "@/components/squad/squad-join-form";
import { Users } from "lucide-react";

export default async function SquadJoinPage({ searchParams }: PageProps<"/squad/join">) {
  const { code } = await searchParams;
  if (!code || typeof code !== "string") {
    return (
      <div className="mx-auto max-w-sm space-y-4 pt-8">
        <div className="text-center">
          <Users className="mx-auto mb-2 size-8 text-primary" />
          <h1 className="text-lg font-semibold">Join a squad session</h1>
          <p className="text-sm text-muted-foreground">Enter the code a friend shared with you.</p>
        </div>
        <SquadJoinForm />
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_squad_by_code", { p_code: code });
  const session = data?.[0];
  if (error || !session) {
    return <ErrorState message={error?.message ?? "No active squad session found with that code."} />;
  }

  redirect(`/squad/${session.id}`);
}
