// AI-generated quest *content* — Google Gemini (free tier), not Claude/Anthropic.
//
// This never touches quest *selection*: lib/quest-engine.ts's rule-based
// recommendQuests() still decides what gets shown and when, exactly as the
// original "not an AI chatbot" requirement calls for. This module only ever
// writes new rows into the same `quests` table shape the rule engine already
// consumes — AI is a content generator feeding the pipeline, nothing more.
import { GoogleGenAI } from "@google/genai";
import type { FitnessGoal, FitnessLevel, IndoorOutdoor, Quest } from "./supabase/types";

export interface QuestGenContext {
  goal: FitnessGoal | null;
  level: FitnessLevel | null;
  preferredActivities: string[];
  preferredDuration: number | null;
  indoorOutdoor: IndoorOutdoor;
  accountType: "student" | "personal";
  /** Real campus_locations.name values for the student's own college, if any —
   * grounds generation in real places instead of inventing venue names. Empty
   * for personal accounts or a student whose college has none yet. */
  collegeVenues: string[];
  /** Recent quest titles (completed or already generated), so it doesn't repeat itself. */
  recentTitles: string[];
}

export type GeneratedQuest = Omit<Quest, "id" | "created_at" | "profile_id">;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    duration_minutes: { type: "INTEGER" },
    difficulty: { type: "STRING", enum: ["Easy", "Medium", "Hard"] },
    location: { type: "STRING" },
    estimated_steps: { type: "INTEGER" },
    points: { type: "INTEGER" },
    indoor_outdoor: { type: "STRING", enum: ["Indoor", "Outdoor"] },
    quest_type: { type: "STRING" },
  },
  required: [
    "title", "description", "duration_minutes", "difficulty", "location",
    "estimated_steps", "points", "indoor_outdoor", "quest_type",
  ],
} as const;

function buildPrompt(ctx: QuestGenContext): string {
  const audienceGuidance =
    ctx.accountType === "student" && ctx.collegeVenues.length > 0
      ? `This is a college student. Set "location" to exactly one of these real campus venues (pick whichever fits the activity best, verbatim): ${ctx.collegeVenues.join(", ")}.`
      : ctx.accountType === "student"
        ? `This is a college student, but their campus has no mapped venues yet. Use generic student-life phrasing (e.g. "before your next class", "Campus grounds") without inventing a specific building name.`
        : `This is NOT a college student — a general/personal user. Never reference a college, campus, class, or hostel. Use generic, location-agnostic wording (e.g. "Wherever you are", "Your neighborhood", "At home", "A nearby court").`;

  const recentGuidance = ctx.recentTitles.length
    ? `Avoid repeating or closely resembling any of these recent quests: ${ctx.recentTitles.join("; ")}.`
    : "";

  return `You are generating exactly one fitness "quest" — a short, single activity suggestion — for a student fitness app.

Student profile:
- Fitness goal: ${ctx.goal ?? "not specified"}
- Fitness level: ${ctx.level ?? "not specified"}
- Preferred activities: ${ctx.preferredActivities.join(", ") || "not specified"}
- Preferred workout duration: ${ctx.preferredDuration ? `${ctx.preferredDuration} minutes` : "not specified"}
- Indoor/outdoor preference: ${ctx.indoorOutdoor}

${audienceGuidance}
${recentGuidance}

Rules for the fields:
- "quest_type" must be one short lowercase_snake_case tag describing the activity category (e.g. short_walk, indoor_workout, group_walk, stair_challenge, sport, stretch, long_run).
- "duration_minutes" should be close to their preferred duration if given, otherwise 5-30.
- "estimated_steps" and "points" should be realistic and proportionate to duration/difficulty (roughly 100-130 steps per minute of walking-type activity; 0 for non-step activities like a stretch).
- Keep "title" under 60 characters and "description" to one short sentence.
- Respond with exactly one quest matching the required JSON schema, nothing else.`;
}

/** Never throws — returns null on any failure (bad JSON, network, rate limit),
 * so the caller can silently fall back to the existing static catalogue. */
export async function generateQuest(ctx: QuestGenContext): Promise<GeneratedQuest | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: buildPrompt(ctx),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!response.text) return null;
    const parsed = JSON.parse(response.text);

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.duration_minutes !== "number" ||
      !["Easy", "Medium", "Hard"].includes(parsed.difficulty) ||
      typeof parsed.location !== "string" ||
      typeof parsed.estimated_steps !== "number" ||
      typeof parsed.points !== "number" ||
      !["Indoor", "Outdoor"].includes(parsed.indoor_outdoor) ||
      typeof parsed.quest_type !== "string"
    ) {
      return null;
    }

    return {
      title: parsed.title,
      description: parsed.description,
      duration_minutes: Math.round(parsed.duration_minutes),
      difficulty: parsed.difficulty,
      location: parsed.location,
      estimated_steps: Math.round(parsed.estimated_steps),
      points: Math.round(parsed.points),
      indoor_outdoor: parsed.indoor_outdoor,
      quest_type: parsed.quest_type,
      audience: ctx.accountType,
    };
  } catch (error) {
    console.error("generateQuest failed:", error);
    return null;
  }
}
