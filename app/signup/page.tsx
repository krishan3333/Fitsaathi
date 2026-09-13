"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { BrandMark } from "@/components/layout/brand-mark";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    // With email confirmation enabled, there's no session until the link is clicked.
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-lift">
          <CardContent className="flex flex-col items-center gap-3 py-9 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success ring-1 ring-inset ring-success/20">
              <MailCheck className="size-6" />
            </div>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Click it to
              finish setting up your account.
            </CardDescription>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <BrandMark className="size-11 rounded-2xl" />
        <h1 className="display mt-5 text-[1.85rem] leading-[1.1]">Create your account</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Takes a minute. Then tell us when you&apos;re free and we&apos;ll do the rest.
        </p>

        <Card className="mt-7 shadow-lift">
          <CardContent>
            <OAuthButtons />
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Sign up
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
