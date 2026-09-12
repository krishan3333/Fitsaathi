import assert from "node:assert/strict";
import test from "node:test";
import { recommendQuests } from "./quest-engine.ts";
import type { Quest } from "./supabase/types.ts";

const catalog: Quest[] = [
  { id: "1", title: "Streak Rescue", description: "", duration_minutes: 5, difficulty: "Easy", location: "Hostel", estimated_steps: 200, points: 10, indoor_outdoor: "Indoor", quest_type: "streak_rescue", audience: "any", profile_id: null, created_at: "" },
  { id: "2", title: "Stair Challenge", description: "", duration_minutes: 8, difficulty: "Medium", location: "Block B", estimated_steps: 900, points: 20, indoor_outdoor: "Indoor", quest_type: "stair_challenge", audience: "any", profile_id: null, created_at: "" },
  { id: "3", title: "Group Walk", description: "", duration_minutes: 15, difficulty: "Easy", location: "Green Loop", estimated_steps: 1800, points: 25, indoor_outdoor: "Outdoor", quest_type: "group_walk", audience: "any", profile_id: null, created_at: "" },
  { id: "4", title: "Campus Run", description: "", duration_minutes: 30, difficulty: "Hard", location: "Sports Ground", estimated_steps: 4200, points: 40, indoor_outdoor: "Outdoor", quest_type: "long_run", audience: "any", profile_id: null, created_at: "" },
  { id: "5", title: "Walk before your 2 PM class", description: "", duration_minutes: 15, difficulty: "Easy", location: "Campus Green Loop", estimated_steps: 2000, points: 20, indoor_outdoor: "Outdoor", quest_type: "short_walk", audience: "student", profile_id: null, created_at: "" },
  { id: "6", title: "Walk on your next break", description: "", duration_minutes: 15, difficulty: "Easy", location: "Wherever you are", estimated_steps: 2000, points: 20, indoor_outdoor: "Outdoor", quest_type: "short_walk", audience: "personal", profile_id: null, created_at: "" },
];

const baseInput = {
  goal: "Stamina" as const,
  level: "Intermediate" as const,
  freeMinutes: 15,
  indoorOutdoorPref: "Both" as const,
  greenWindow: "green" as const,
  friendsAvailable: 0,
  daysSinceActive: 0,
  lowImpact: false,
  accountType: "student" as const,
};

test("missed active days surfaces Streak Rescue first", () => {
  const top = recommendQuests(catalog, { ...baseInput, daysSinceActive: 3 })[0];
  assert.equal(top.quest.quest_type, "streak_rescue");
});

test("two+ friends free surfaces a group activity", () => {
  const top = recommendQuests(catalog, { ...baseInput, friendsAvailable: 2 })[0];
  assert.equal(top.quest.quest_type, "group_walk");
});

test("red green-window forces indoor picks only", () => {
  const results = recommendQuests(catalog, { ...baseInput, greenWindow: "red" }, 4);
  assert.ok(results.every((r) => r.quest.indoor_outdoor === "Indoor"));
});

test("short free time avoids the 30-minute run", () => {
  const results = recommendQuests(catalog, { ...baseInput, freeMinutes: 8 });
  assert.ok(!results.some((r) => r.quest.id === "4"));
});

test("a personal account never gets a student-only quest", () => {
  const results = recommendQuests(catalog, { ...baseInput, accountType: "personal" }, 10);
  assert.ok(!results.some((r) => r.quest.audience === "student"));
  assert.ok(results.some((r) => r.quest.id === "6"), "should include the personal-audience alternative");
});

test("a student account never gets a personal-only quest", () => {
  const results = recommendQuests(catalog, { ...baseInput, accountType: "student" }, 10);
  assert.ok(!results.some((r) => r.quest.audience === "personal"));
  assert.ok(results.some((r) => r.quest.id === "5"), "should include the student-audience alternative");
});
