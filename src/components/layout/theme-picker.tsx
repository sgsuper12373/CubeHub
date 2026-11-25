"use client";

import { useSyncExternalStore } from "react";

import { getThemeServerSnapshot, getThemeSnapshot, setTheme, subscribeTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { THEMES } from "@/themes";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  ...THEMES.map((t) => ({ value: t.id, label: t.name })),
  { value: "system", label: "System" },
];

/**
 * Slate / Paper / System, for everyone (guests can't reach Settings). In the
 * expanded sidebar's footer and the phone More sheet; Settings has its own.
 * The choice is the `cubehub-theme` cookie, shared across both hosts.
 */
export function ThemePicker({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("flex gap-0.5 rounded-lg bg-muted/60 p-0.5 text-xs", className)}>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={(e) => {
            // Keep the click away from window listeners (the timer's touch stage).
            e.stopPropagation();
            setTheme(value);
          }}
          className={cn(
            "flex-1 rounded-md px-2 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            current === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
