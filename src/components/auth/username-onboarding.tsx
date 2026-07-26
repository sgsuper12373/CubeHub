"use client";

import { useActionState, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrentProfile } from "@/lib/auth/dal";
import { updateProfile, type ProfileState } from "@/lib/auth/actions";

const SKIP_SESSION_KEY = "cubehub_skip_username_onboarding";

export function UsernameOnboarding({
  profile,
}: {
  profile: CurrentProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );

  useEffect(() => {
    if (!profile) return;

    // Check if the username matches the auto-generated format: user_<12 hex chars>
    const isDefaultHandle = /^user_[0-9a-f]{12}$/i.test(profile.username);
    const wasSkipped = sessionStorage.getItem(SKIP_SESSION_KEY) === "true";

    if (isDefaultHandle && !wasSkipped) {
      // Delay slightly for smooth transition on page load
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const shouldShow = open && !dismissed && !state?.success;
  if (!shouldShow || !profile) return null;

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_SESSION_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Choose your CubeHub handle
            </h2>
            <p className="text-xs text-muted-foreground">
              Personalize your identity for leaderboards and profiles.
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onboard-username">Username</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm font-mono">
                @
              </span>
              <Input
                id="onboard-username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                pattern="^[A-Za-z0-9_]+$"
                placeholder="speedcuber_in"
                className="pl-7 font-mono text-sm"
                defaultValue=""
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–24 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboard-display-name">
              Display Name <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="onboard-display-name"
              name="display_name"
              type="text"
              placeholder="e.g., Sumit Garad"
              maxLength={50}
              className="text-sm"
            />
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={pending}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save handle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
