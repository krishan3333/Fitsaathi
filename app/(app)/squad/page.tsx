import Link from "next/link";
import { Users, ArrowRight, LogIn, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartSquadDialog } from "@/components/squad/start-squad-dialog";

interface SessionRow {
  id: string;
  activity_type: string;
  status: string;
  created_at: string;
  isHost: boolean;
}

async function loadSessions(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: memberships } = await supabase.from("squad_participants").select("session_id").eq("profile_id", userId);
  const sessionIds = (memberships ?? []).map((m) => m.session_id);
  if (sessionIds.length === 0) return [];

  const { data: sessions } = await supabase
    .from("squad_sessions")
    .select("id, activity_type, status, host_id, created_at")
    .in("id", sessionIds)
    .order("created_at", { ascending: false })
    .limit(20);

  return (sessions ?? []).map((s): SessionRow => ({ id: s.id, activity_type: s.activity_type, status: s.status, created_at: s.created_at, isHost: s.host_id === userId }));
}

const STATUS_LABEL: Record<string, string> = { pending: "Lobby", live: "Live", ended: "Finished", cancelled: "Cancelled" };

export default async function SquadHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let sessions: SessionRow[];
  try {
    sessions = await loadSessions(supabase, user.id);
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "Couldn't load squad sessions."} />;
  }

  const active = sessions.filter((s) => s.status === "pending" || s.status === "live");
  const past = sessions.filter((s) => s.status === "ended" || s.status === "cancelled");

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="display text-[1.6rem] leading-none">Squad</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          Walk, run or cycle live with your Fit Circle. Finish together and the session is peer-verified.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StartSquadDialog trigger={<Button className="w-full"><Play /> Start</Button>} />
        <Button variant="outline" className="w-full" asChild>
          <Link href="/squad/join">
            <LogIn /> Join by code
          </Link>
        </Button>
      </div>

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
          {active.map((s) => (
            <SessionRowCard key={s.id} session={s} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Past sessions</h2>
        {past.length === 0 ? (
          <EmptyState icon={Users} title="No squad sessions yet" description="Start one above and invite your Fit Circle." />
        ) : (
          past.map((s) => <SessionRowCard key={s.id} session={s} />)
        )}
      </section>
    </div>
  );
}

function SessionRowCard({ session }: { session: SessionRow }) {
  return (
    <Link href={`/squad/${session.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium capitalize">Squad {session.activity_type}</p>
            <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={session.status === "live" ? "success" : session.status === "pending" ? "default" : "muted"}>{STATUS_LABEL[session.status]}</Badge>
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
