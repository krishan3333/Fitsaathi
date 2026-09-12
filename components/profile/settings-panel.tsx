"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStoredTheme, toggleTheme } from "@/components/layout/theme-script";
import type { Profile } from "@/lib/supabase/types";

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi"];

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // Deferred to after mount (rather than a lazy useState initializer) so the
    // server-rendered markup always matches the client's first paint, then
    // corrects to the real theme — avoids a hydration mismatch warning.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(getStoredTheme() === "dark");
  }, []);

  async function update<K extends keyof Profile>(field: K, value: Profile[K]) {
    setSaving(field);
    const supabase = createClient();
    await supabase.from("profiles").update({ [field]: value } as Partial<Profile>).eq("id", profile.id);
    setSaving(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          <Row label="Hide step count from friends" description="Others see your name but not your numbers">
            <Switch defaultChecked={profile.hide_steps} disabled={saving === "hide_steps"} onCheckedChange={(v) => update("hide_steps", v)} />
          </Row>
          <Row label="Hide precise location" description="Coordinators only ever see anonymous, aggregated data">
            <Switch defaultChecked={profile.hide_location} disabled={saving === "hide_location"} onCheckedChange={(v) => update("hide_location", v)} />
          </Row>
          <Row label="Use nickname in public challenges" description="Shows your nickname instead of your name">
            <Switch defaultChecked={profile.use_nickname} disabled={saving === "use_nickname"} onCheckedChange={(v) => update("use_nickname", v)} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          <Row label="Notifications" description="Streak reminders, challenge updates, quest nudges">
            <Switch defaultChecked={profile.notifications_enabled} disabled={saving === "notifications_enabled"} onCheckedChange={(v) => update("notifications_enabled", v)} />
          </Row>
          <Row label="Language">
            <Select defaultValue={profile.preferred_language} onValueChange={(v) => update("preferred_language", v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Dark mode">
            <Switch checked={dark} onCheckedChange={() => setDark(toggleTheme())} />
          </Row>
        </CardContent>
      </Card>
    </>
  );
}
