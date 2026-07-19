"use client";

import { Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InspectionMode, TimerSettings } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/**
 * Inline quick-settings popover for the timer page. Contains the settings
 * cubers tweak between solves: inspection, hide-time, hold duration, precision.
 *
 * Changes apply instantly to the Zustand store via `onChange`. The parent
 * is responsible for persisting (via settings-persistence.ts).
 *
 * Renders only when phase is idle or stopped — never during a solve.
 */
export function QuickSettings({
  settings,
  onChange,
  isAuthed,
}: {
  settings: TimerSettings;
  onChange: (partial: Partial<TimerSettings>) => void;
  isAuthed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Timer settings"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(open && "text-primary")}
      >
        <Settings className="size-4" />
      </Button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm",
            "animate-in fade-in slide-in-from-top-2 duration-150",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Quick Settings
            </h3>
            <button
              type="button"
              aria-label="Close settings"
              className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Inspection mode */}
            <SettingRow label="Inspection">
              <SegmentedControl
                options={[
                  { value: "off", label: "Off" },
                  { value: "8s", label: "8s" },
                  { value: "15s", label: "15s" },
                ]}
                value={settings.inspectionMode}
                onChange={(v) =>
                  onChange({ inspectionMode: v as InspectionMode })
                }
              />
            </SettingRow>

            {/* Hide time while solving */}
            <SettingRow label="Hide time">
              <ToggleSwitch
                checked={settings.hideTimeWhileSolving}
                onChange={(v) => onChange({ hideTimeWhileSolving: v })}
                label="Hide time while solving"
              />
            </SettingRow>

            {/* Hold duration */}
            <SettingRow label="Hold duration">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={150}
                  max={550}
                  step={50}
                  value={settings.holdMs}
                  onChange={(e) =>
                    onChange({ holdMs: parseInt(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  aria-label="Hold duration"
                />
                <span className="w-12 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {settings.holdMs}ms
                </span>
              </div>
            </SettingRow>

            {/* Time precision */}
            <SettingRow label="Precision">
              <SegmentedControl
                options={[
                  { value: "2", label: ".XX" },
                  { value: "3", label: ".XXX" },
                ]}
                value={String(settings.precision)}
                onChange={(v) =>
                  onChange({ precision: parseInt(v) as 2 | 3 })
                }
              />
            </SettingRow>

            {/* Scramble preview */}
            <SettingRow label="Preview">
              <ToggleSwitch
                checked={settings.showScramblePreview}
                onChange={(v) => onChange({ showScramblePreview: v })}
                label="Show scramble preview"
              />
            </SettingRow>

            {/* Voice callouts (only relevant when inspection is on) */}
            {settings.inspectionMode !== "off" && (
              <SettingRow label="Voice">
                <ToggleSwitch
                  checked={settings.voiceEnabled}
                  onChange={(v) => onChange({ voiceEnabled: v })}
                  label="Voice callouts during inspection"
                />
              </SettingRow>
            )}
          </div>

          {/* Link to full settings */}
          {isAuthed && (
            <a
              href="/settings"
              className="mt-4 block text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              All settings →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable sub-components ──

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
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
    <div className="flex rounded-lg border border-border p-0.5" role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
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
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
