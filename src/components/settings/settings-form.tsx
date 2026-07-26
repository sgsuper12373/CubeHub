"use client";

import { useActionState, useEffect, useSyncExternalStore, useTransition, useState } from "react";
import { LogOut, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type Theme,
  setTheme,
  subscribeTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
} from "@/lib/theme";
import type { CurrentProfile, ServerTimerSettings } from "@/lib/auth/dal";
import { updateProfile, type ProfileState } from "@/lib/auth/actions";
import { toast } from "@/stores/toast-store";
import {
  DEFAULT_TIMER_SETTINGS,
  type InspectionMode,
  type TimerSettings,
} from "@/lib/timer/types";
import { loadClientSettings, saveSettings } from "@/lib/timer/settings-persistence";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/stores/timer-store";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({
  initialSettings,
  profile,
}: {
  initialSettings: ServerTimerSettings | null;
  profile: CurrentProfile | null;
}) {
  // Settings live in the timer store rather than a second local copy, so this
  // page and /timer can't drift — change precision here and the timer already
  // has it. Hydration goes through `applySettings`, a store action, which is
  // also why it doesn't cascade a render the way a setState in an effect would.
  const settings = useTimerStore((s) => s.settings);

  // Cookie-backed and client-only, so it is read as an external store with a
  // server snapshot matching what the root layout rendered.
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const [, startTransition] = useTransition();

  useEffect(() => {
    // The server stores four of these fields; the rest come from localStorage.
    useTimerStore.getState().applySettings({
      ...DEFAULT_TIMER_SETTINGS,
      ...initialSettings,
      ...loadClientSettings(),
    });
  }, [initialSettings]);

  const handleChange = (partial: Partial<TimerSettings>) => {
    useTimerStore.getState().applySettings(partial);

    // Fire the save action in the background
    startTransition(() => {
      saveSettings(partial, true);
    });
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t); // notifies subscribers, so `theme` above updates
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // AuthListener will pick this up and redirect/refresh
  };

  return (
    <div className="w-full max-w-2xl space-y-12 pb-24">
      {/* ── Profile / Account ── */}
      <ProfileForm profile={profile} onSignOut={handleSignOut} />

      {/* ── Timer ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Timer Behavior</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
          <SettingRow
            label="Inspection Mode"
            description="WCA standard is 15 seconds."
          >
            <SegmentedControl
              options={[
                { value: "off", label: "Off" },
                { value: "8s", label: "8s" },
                { value: "15s", label: "15s" },
              ]}
              value={settings.inspectionMode}
              onChange={(v) =>
                handleChange({ inspectionMode: v as InspectionMode })
              }
            />
          </SettingRow>

          <SettingRow
            label="Hold Duration"
            description="How long you must hold before the timer turns green."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={150}
                max={550}
                step={50}
                value={settings.holdMs}
                onChange={(e) => handleChange({ holdMs: parseInt(e.target.value) })}
                className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <span className="w-12 text-right font-mono text-sm tabular-nums text-muted-foreground">
                {settings.holdMs}ms
              </span>
            </div>
          </SettingRow>

          <SettingRow
            label="Hide Time"
            description="Hide the running clock while solving."
          >
            <ToggleSwitch
              checked={settings.hideTimeWhileSolving}
              onChange={(v) => handleChange({ hideTimeWhileSolving: v })}
            />
          </SettingRow>

          <SettingRow
            label="Time Precision"
            description="Decimal places for the time display."
          >
            <SegmentedControl
              options={[
                { value: "2", label: ".XX" },
                { value: "3", label: ".XXX" },
              ]}
              value={String(settings.precision)}
              onChange={(v) =>
                handleChange({ precision: parseInt(v) as 2 | 3 })
              }
            />
          </SettingRow>
        </div>
      </section>

      {/* ── Display ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Display</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
          <SettingRow label="Theme" description="Choose your preferred color scheme.">
            <SegmentedControl
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              value={theme}
              onChange={(v) => handleThemeChange(v as Theme)}
            />
          </SettingRow>
          
          <SettingRow label="Scramble Preview" description="Show a 2D preview of the scramble.">
            <ToggleSwitch
              checked={settings.showScramblePreview}
              onChange={(v) => handleChange({ showScramblePreview: v })}
            />
          </SettingRow>

          {settings.inspectionMode !== "off" && (
            <SettingRow label="Voice Callouts" description="Announce 8s and 12s warnings during inspection.">
              <ToggleSwitch
                checked={settings.voiceEnabled}
                onChange={(v) => handleChange({ voiceEnabled: v })}
              />
            </SettingRow>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="space-y-1">
        <p className="font-medium leading-none">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border p-1 bg-muted/30" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

function ProfileForm({
  profile,
  onSignOut,
}: {
  profile: CurrentProfile | null;
  onSignOut: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");

  const isDefaultHandle = profile
    ? /^user_[0-9a-f]{12}$/i.test(profile.username)
    : false;
  const isDirty = profile
    ? username !== profile.username ||
      displayName !== (profile.display_name ?? "")
    : false;

  useEffect(() => {
    if (state?.success) {
      toast({
        kind: "info",
        message: "Profile updated successfully!",
        durationMs: 3500,
      });
    } else if (state?.error) {
      toast({
        kind: "error",
        message: state.error,
        durationMs: 5000,
      });
    }
  }, [state]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Account & Profile</h2>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-6">
        {isDefaultHandle && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-sm text-primary flex items-center justify-between">
            <span>
              You currently have an auto-generated handle. Choose your permanent
              username below!
            </span>
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="settings-username">Username</Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm font-mono">
                @
              </span>
              <Input
                id="settings-username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                pattern="^[A-Za-z0-9_]+$"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-7 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–24 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="settings-display-name">Display Name</Label>
            <Input
              id="settings-display-name"
              name="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional nickname"
              maxLength={50}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Shown on profile cards and navigation menus.
            </p>
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-destructive font-medium">
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={pending || !isDirty}
              className="min-w-28"
            >
              {pending ? (
                "Saving…"
              ) : state?.success && !isDirty ? (
                <span className="flex items-center gap-1.5">
                  <Check className="size-4" /> Saved
                </span>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              Log out of your CubeHub account on this device.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onSignOut}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
          >
            <LogOut className="mr-2 size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </section>
  );
}
