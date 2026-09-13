"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Chip, FreeSlotPicker, keysToSlots } from "@/components/profile/profile-fields";
import { ACTIVITIES, DURATIONS, GOALS, INDOOR_OUTDOOR, LANGUAGES, LEVELS, type Duration } from "@/lib/profile-options";
import type { FitnessGoal, FitnessLevel, IndoorOutdoor } from "@/lib/supabase/types";

const STEPS = ["Basics", "Goals", "Preferences", "Schedule"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"student" | "personal" | null>(null);
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [level, setLevel] = useState<FitnessLevel | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [indoorOutdoor, setIndoorOutdoor] = useState<IndoorOutdoor>("Both");
  const [language, setLanguage] = useState("English");
  const [lowImpact, setLowImpact] = useState(false);
  const [slots, setSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const metaName = (data.user?.user_metadata?.name ?? data.user?.user_metadata?.full_name) as string | undefined;
        if (metaName) setName(metaName);
        if (data.user?.email) setEmail(data.user.email);
      });
  }, []);

  function toggleActivity(activity: string) {
    setActivities((prev) => (prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]));
  }

  const canProceed = [
    Boolean(name.trim() && accountType && (accountType === "personal" || (college.trim() && department.trim()))),
    Boolean(goal && level),
    Boolean(activities.length > 0 && duration),
    true,
  ][step];

  async function handleSubmit() {
    // canProceed already blocks reaching this step without a choice made —
    // this guard is purely for TypeScript's benefit.
    if (!accountType) return;

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      setError("Your session expired — please log in again.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
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
        onboarded: true,
      })
      .eq("id", userData.user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      {email && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-muted px-3.5 py-2 text-xs text-muted-foreground">
          <span className="truncate">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </span>
          <SignOutButton variant="ghost" size="sm" className="h-auto shrink-0 px-2 py-1 text-xs">
            Not you? Sign out
          </SignOutButton>
        </div>
      )}
      <div className="mb-7">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <p className="mt-2.5 text-[0.75rem] text-muted-foreground">
          <span className="tnum">
            {step + 1} of {STEPS.length}
          </span>{" "}
          · {STEPS[step]}
        </p>
      </div>

      <div className="flex-1 space-y-5">
        {step === 0 && (
          <>
            <h1 className="display text-[1.6rem] leading-tight">Tell us about you</h1>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Are you a student, or using FitSaathi personally?</Label>
              <div className="flex flex-wrap gap-2">
                <Chip selected={accountType === "student"} onClick={() => setAccountType("student")}>Student</Chip>
                <Chip selected={accountType === "personal"} onClick={() => setAccountType("personal")}>Personal / General</Chip>
              </div>
              {accountType === null && (
                <p className="text-xs text-muted-foreground">Choose one to continue — you can change this later in your profile.</p>
              )}
            </div>
            {accountType === "student" && (
              <>
                <div className="space-y-1.5">
                  <Label>College / campus</Label>
                  <Input value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Delhi College of Engineering" />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="CSE" />
                </div>
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="display text-[1.6rem] leading-tight">What&apos;s your goal?</h1>
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
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="display text-[1.6rem] leading-tight">Your preferences</h1>
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
            <div className="space-y-1.5">
              <Label>Preferred language</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip key={l} selected={language === l} onClick={() => setLanguage(l)}>{l}</Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <p className="text-sm font-medium">Low-impact workouts</p>
                <p className="text-xs text-muted-foreground">Optional — easier on joints</p>
              </div>
              <Switch checked={lowImpact} onCheckedChange={setLowImpact} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="display text-[1.6rem] leading-tight">When are you usually free?</h1>
            <p className="text-sm text-muted-foreground">Tap the slots that fit your timetable — used to suggest quests at the right time.</p>
            <FreeSlotPicker value={slots} onChange={setSlots} />
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button className="flex-1" disabled={saving} onClick={handleSubmit}>
            {saving && <Loader2 className="animate-spin" />}
            Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}
