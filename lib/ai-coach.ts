// AI-generated chat *replies* for the floating "Moveup Buddy" widget —
// Google Gemini (free tier), same GEMINI_API_KEY as lib/quest-generator.ts.
// Unlike the quest planner, this is deliberately a free-form chat surface
// (tips + video pointers + casual talk), not the rule-based recommendation
// engine the app otherwise relies on.
import { GoogleGenAI } from "@google/genai";

export interface CoachMessage {
  role: "user" | "model";
  text: string;
}

export interface CoachReply {
  reply: string;
  videoQueries: string[];
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    videoQueries: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["reply", "videoQueries"],
} as const;

const SYSTEM_INSTRUCTION = `You are "Moveup Buddy", a friendly, upbeat fitness chat assistant inside a
college fitness app. You talk to students one-on-one in a small floating chat window.

What you're for:
- Practical exercise/workout tips, form pointers, warm-up/cool-down advice, motivation, and
  general "what should I do today" style chat.
- Casual small talk is fine too — students may just say hi or vent about being tired. Be warm
  and brief, then gently steer back to something useful.

Rules:
- Keep "reply" to 2-4 short sentences. Plain, encouraging, peer-to-peer tone — not clinical.
- You are NOT a doctor. Never diagnose, prescribe treatment, or give medical advice. For pain,
  injury, or anything medical, tell them to see a doctor/campus health center instead of guessing.
- When the question is about a specific exercise, workout, or technique, put 1-3 short YouTube
  *search phrases* (not titles, not channel names, not URLs) in "videoQueries" — e.g.
  "beginner push up form tutorial". The app turns these into real YouTube search links itself,
  so never invent a specific video title, channel, or link.
- Leave "videoQueries" as an empty array when a video wouldn't help (pure small talk, planning
  questions, etc.) — don't force one in every reply.
- Always return both fields, matching the required JSON schema, nothing else.`;

// Gemini has no server-side memory of this conversation, so the client resends
// prior turns each call — cap what we forward to keep prompts small and bounded.
const MAX_HISTORY = 12;
const MAX_VIDEO_QUERIES = 3;

/** Never throws — returns null on any failure (missing key, bad JSON, network,
 * rate limit), so the route can turn it into a friendly "try again" response. */
export async function askCoach(history: CoachMessage[]): Promise<CoachReply | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const trimmed = history.slice(-MAX_HISTORY);
  if (trimmed.length === 0) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: trimmed.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!response.text) return null;
    const parsed = JSON.parse(response.text);
    if (typeof parsed.reply !== "string" || !Array.isArray(parsed.videoQueries)) return null;

    return {
      reply: parsed.reply,
      videoQueries: parsed.videoQueries.filter((q: unknown): q is string => typeof q === "string").slice(0, MAX_VIDEO_QUERIES),
    };
  } catch (error) {
    console.error("askCoach failed:", error);
    return null;
  }
}
