"use client";

import { useEffect, useState, useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type Theme, setTheme, getThemeFromCookie } from "@/lib/theme";
import type { TimerSettings } from "@/lib/timer/types";
import { saveSettings } from "@/lib/timer/settings-persistence";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({
  initialSettings,
  userId,
}: {
  initialSettings: TimerSettings;
  userId: string;
}) {
  const [settings, setLocalSettings] = useState<TimerSettings>(initialSettings);
  const [theme, setLocalTheme] = useState<Theme>("dark");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Read theme from cookie on mount
    setLocalTheme(getThemeFromCookie(document.cookie));
  }, []);

  const handleChange = (partial: Partial<TimerSettings>) => {
    const next = { ...settings, ...partial };
    setLocalSettings(next);
    
    // Fire the save action in the background
    startTransition(() => {
      saveSettings(partial, true);
    });
  };

  const handleThemeChange = (t: Theme) => {
    setLocalTheme(t);
    setTheme(t);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // AuthListener will pick this up and redirect/refresh
  };

  return (
    <div className="w-full max-w-2xl space-y-12 pb-24">
      {/* ── Profile / Account ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Account</h2>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Display Name</label>
            <input
              type="text"
              className="h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue="SpeedCuber" // TODO: Wire to profiles table
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Display names will be wired up in a future update.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <Button variant="outline" onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </section>

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
              onChange={(v) => handleChange({ inspectionMode: v as any })}
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
              onChange={(v) => handleChange({ precision: parseInt(v) as any })}
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
