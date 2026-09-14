import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askCoach, type CoachMessage } from "@/lib/ai-coach";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 600;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to chat with the Buddy." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const rawMessages = body?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const history: CoachMessage[] = [];
  for (const m of rawMessages.slice(-MAX_MESSAGES)) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "model") ||
      typeof m.text !== "string" ||
      m.text.length === 0 ||
      m.text.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json({ error: "invalid message" }, { status: 400 });
    }
    history.push({ role: m.role, text: m.text });
  }

  const result = await askCoach(history);
  if (!result) {
    return NextResponse.json({ error: "Buddy is unavailable right now — try again in a bit." }, { status: 502 });
  }

  return NextResponse.json(result);
}
