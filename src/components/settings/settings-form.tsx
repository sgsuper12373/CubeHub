"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  type ThemePreference,
  setTheme,
  subscribeTheme,
  getThemeSnapshot,
  getThemeServerSnapshot,
} from "@/lib/theme";
import type { CurrentProfile, ServerTimerSettings } from "@/lib/auth/dal";
import {
  DEFAULT_TIMER_SETTINGS,
  type InspectionAlert,
  type InspectionMode,
  type TimerSettings,
} from "@/lib/timer/types";
import { loadClientSettings, saveSettings } from "@/lib/timer/settings-persistence";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/stores/timer-store";
import { THEMES } from "@/themes";
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

  const handleThemeChange = (t: ThemePreference) => {
    setTheme(t); // notifies subscribers, so `theme` above updates
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // AuthListener will pick this up and redirect/refresh
  };

  return (
    <div className="w-full max-w-2xl space-y-12 pb-24">
      {/* ── Account ── */}
      <AccountSection profile={profile} onSignOut={handleSignOut} />

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

          <SettingRow
            label="Timer Size"
            description="Adjust the size of the running timer digits."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={250}
                step={10}
                value={settings.timerFontSize ?? 100}
                onChange={(e) => handleChange({ timerFontSize: parseInt(e.target.value) })}
                className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <span className="w-12 text-right font-mono text-sm tabular-nums text-muted-foreground">
                {settings.timerFontSize ?? 100}%
              </span>
            </div>
          </SettingRow>

          <SettingRow
            label="Disable Mouse Click"
            description="Disable starting the timer by clicking with a mouse."
          >
            <ToggleSwitch
              checked={settings.disableMouseClick}
              onChange={(v) => handleChange({ disableMouseClick: v })}
            />
          </SettingRow>
        </div>
      </section>

      {/* ── Display ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Display</h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50">
          <SettingRow label="Theme" description="Slate is dark, Paper is light. System follows your device.">
            <SegmentedControl
              options={[
                ...THEMES.map((t) => ({ value: t.id, label: t.name })),
                { value: "system", label: "System" },
              ]}
              value={theme}
              onChange={(v) => handleThemeChange(v as ThemePreference)}
            />
          </SettingRow>
          
          <SettingRow label="Scramble Preview" description="Show the scrambled puzzle next to the timer.">
            <ToggleSwitch
              checked={settings.showScramblePreview}
              onChange={(v) => handleChange({ showScramblePreview: v })}
            />
          </SettingRow>

          {settings.showScramblePreview && (
            <SettingRow label="Preview Style" description="A flat net, or a 3D cube you can spin.">
              <SegmentedControl
                options={[
                  { value: "2D", label: "2D net" },
                  { value: "3D", label: "3D cube" },
                ]}
                value={settings.previewDimension}
                onChange={(v) => handleChange({ previewDimension: v === "3D" ? "3D" : "2D" })}
              />
            </SettingRow>
          )}

          {settings.inspectionMode !== "off" && (
            <SettingRow label="Inspection Alert" description="Call out the 8s and 12s warnings with a voice or beeps.">
              <SegmentedControl
                options={[
                  { value: "voice", label: "Voice" },
                  { value: "beep", label: "Beep" },
                  { value: "off", label: "Off" },
                ]}
                value={settings.inspectionAlert}
                onChange={(v) => handleChange({ inspectionAlert: v as InspectionAlert })}
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

/**
 * Who you're signed in as, and the way to everything profile-related. The
 * username, name, photo and privacy all live together in Edit profile.
 */
function AccountSection({
  profile,
  onSignOut,
}: {
  profile: CurrentProfile | null;
  onSignOut: () => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Account</h2>
      <div className="divide-y divide-border/50 rounded-xl border border-border bg-card">
        {profile && (
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="space-y-1">
              <p className="font-medium leading-none">
                {profile.display_name || profile.username}{" "}
                <span className="font-mono text-sm font-normal text-muted-foreground">@{profile.username}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Username, name, photo and privacy are all in Edit profile.
              </p>
            </div>
            <Button variant="outline" nativeButton={false} render={<Link href="/profile/edit" />} className="shrink-0">
              Edit profile
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              Log out of your CubeHub account on this device.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onSignOut}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </section>
  );
}
