// Simple rule-based quest planner — no AI/LLM involved, just readable rules
// over the quest catalogue. Pure function: easy to unit test (see bottom).

import type { FitnessGoal, FitnessLevel, IndoorOutdoor, Quest } from "./supabase/types";
import type { GreenWindowStatus } from "./weather";

export interface QuestPlannerInput {
  goal: FitnessGoal | null;
  level: FitnessLevel | null;
  freeMinutes: number;
  indoorOutdoorPref: IndoorOutdoor;
  greenWindow: GreenWindowStatus;
  friendsAvailable: number;
  daysSinceActive: number; // 0 = active today
  lowImpact: boolean;
  accountType: "student" | "personal";
}

export interface RecommendedQuest {
  quest: Quest;
  reason: string;
}

/** Highest-priority rule wins; ties broken by closeness to the free time available. */
export function recommendQuests(fullCatalog: Quest[], input: QuestPlannerInput, count = 3): RecommendedQuest[] {
  // Never serve campus-specific quests ("before your 2 PM class", named
  // campus venues) to a personal account, or generic ones' campus
  // counterparts to a student — audience "any" fits everyone.
  const catalog = fullCatalog.filter((q) => q.audience === "any" || q.audience === input.accountType);
  const mustBeIndoor = input.greenWindow === "red" || input.indoorOutdoorPref === "Indoor";
  const results: RecommendedQuest[] = [];

  const pick = (predicate: (q: Quest) => boolean, reason: string) => {
    const q = catalog
      .filter((q) => !results.some((r) => r.quest.id === q.id))
      .filter(predicate)
      .filter((q) => (mustBeIndoor ? q.indoor_outdoor === "Indoor" : true))
      .sort((a, b) => Math.abs(a.duration_minutes - input.freeMinutes) - Math.abs(b.duration_minutes - input.freeMinutes))[0];
    if (q) results.push({ quest: q, reason });
    return Boolean(q);
  };

  // Rule 1: missed active days → Streak Rescue, highest priority.
  if (input.daysSinceActive >= 2) {
    pick((q) => q.quest_type === "streak_rescue", "You missed a couple of active days — a Streak Rescue keeps your momentum.");
  }

  // Rule 2: very short free time → stretch / hostel workout / stairs.
  if (input.freeMinutes < 10) {
    pick(
      (q) => ["stretch", "indoor_workout", "stair_challenge"].includes(q.quest_type),
      "Only a few minutes free — something quick that fits right in."
    );
  }

  // Rule 3: two or more friends free → group walk / team activity.
  if (input.friendsAvailable >= 2) {
    pick((q) => ["group_walk", "sport"].includes(q.quest_type), `${input.friendsAvailable} friends are free right now — make it social.`);
  }

  // Rule 4: weather/AQI forces indoor.
  if (mustBeIndoor) {
    pick((q) => q.indoor_outdoor === "Indoor", "Weather/AQI isn't great outside — staying indoors today.");
  }

  // Rule 5: beginners get lower-intensity picks.
  if (input.level === "Beginner" || input.lowImpact) {
    pick((q) => q.difficulty === "Easy", "Matched to your fitness level — easing in with a lower-intensity quest.");
  }

  // Fallback: closest duration match, respecting indoor/outdoor + green window.
  // Stop as soon as a pick fails to find a candidate — no more matches exist.
  while (results.length < count && pick(() => true, "Fits your free time and preferences.")) {
    /* keep filling */
  }

  return results.slice(0, count);
}
