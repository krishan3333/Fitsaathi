"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip, FreeSlotPicker, slotsToKeys, keysToSlots } from "@/components/profile/profile-fields";
import { ACTIVITIES, DURATIONS, GOALS, INDOOR_OUTDOOR, LANGUAGES, LEVELS, type Duration } from "@/lib/profile-options";
import type { FitnessGoal, FitnessLevel, IndoorOutdoor, Profile } from "@/lib/supabase/types";

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [accountType, setAccountType] = useState<"student" | "personal">(profile.account_type);
  const [college, setCollege] = useState(profile.college ?? "");
  const [department, setDepartment] = useState(profile.department ?? "");
  const [goal, setGoal] = useState<FitnessGoal | null>(profile.fitness_goal);
  const [level, setLevel] = useState<FitnessLevel | null>(profile.fitness_level);
  const [activities, setActivities] = useState<string[]>(profile.preferred_activities ?? []);
  const [duration, setDuration] = useState<Duration | null>(profile.preferred_duration);
  const [indoorOutdoor, setIndoorOutdoor] = useState<IndoorOutdoor>(profile.indoor_outdoor);
  const [language, setLanguage] = useState(profile.preferred_language);
  const [lowImpact, setLowImpact] = useState(profile.low_impact);
  const [slots, setSlots] = useState<Set<string>>(slotsToKeys(profile.free_slots ?? []));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleActivity(activity: string) {
    setActivities((prev) => (prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        nickname: nickname.trim() || null,
        account_type: accountType,
        college: accountType === "student" ? college.trim() : null,
        department: accountType === "student" ? department.trim() : null,
        fitness_goal: goal,
        fitness_level: level,
        preferred_activities: activities,
        preferred_duration: duration,
        indoor_outdoor: indoorOutdoor,
        preferred_language: language,
        low_impact: lowImpact,
        free_slots: keysToSlots(slots),
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to profile">
          <Link href="/profile">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Edit profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Shown in public challenges if enabled" />
          </div>
          {profile.role !== "coordinator" && (
            <div className="space-y-1.5">
              <Label>Account type</Label>
              <div className="flex flex-wrap gap-2">
                <Chip selected={accountType === "student"} onClick={() => setAccountType("student")}>Student</Chip>
                <Chip selected={accountType === "personal"} onClick={() => setAccountType("personal")}>Personal / General</Chip>
              </div>
            </div>
          )}
          {(accountType === "student" || profile.role === "coordinator") && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="college">College / campus</Label>
                <Input id="college" required value={college} onChange={(e) => setCollege(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input id="department" required value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fitness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fitness goal</Label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip key={g} selected={goal === g} onClick={() => setGoal(g)}>{g}</Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fitness level</Label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Chip key={l} selected={level === l} onClick={() => setLevel(l)}>{l}</Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred activities</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => (
                <Chip key={a} selected={activities.includes(a)} onClick={() => toggleActivity(a)}>{a}</Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred workout duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip key={d} selected={duration === d} onClick={() => setDuration(d)}>{d} min</Chip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Indoor / outdoor</Label>
            <div className="flex flex-wrap gap-2">
              {INDOOR_OUTDOOR.map((io) => (
                <Chip key={io} selected={indoorOutdoor === io} onClick={() => setIndoorOutdoor(io)}>{io}</Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
            <div>
              <p className="text-sm font-medium">Low-impact workouts</p>
              <p className="text-xs text-muted-foreground">Easier on joints</p>
            </div>
            <Switch checked={lowImpact} onCheckedChange={setLowImpact} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Free time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Tap the slots that fit your timetable — quests are suggested around these.</p>
          <FreeSlotPicker value={slots} onChange={setSlots} />
          <div className="space-y-1.5">
            <Label>Preferred language</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Chip key={l} selected={language === l} onClick={() => setLanguage(l)}>{l}</Chip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="sticky bottom-20 flex gap-3 md:bottom-4">
        <Button type="submit" className="flex-1 shadow-lg" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
          {saved ? "Saved" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
