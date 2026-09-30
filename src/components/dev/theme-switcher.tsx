// TEMP(step 8): remove when the theme settings page ships.
"use client";

import { useSyncExternalStore } from "react";

import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { THEMES } from "@/themes";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  ...THEMES.map((t) => ({ value: t.id, label: t.name })),
  { value: "system", label: "System" },
];

// Both values are inlined at build time. When this is false the minifier drops
// the switcher entirely, so it isn't in the layout chunk every page loads.
const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_THEME_SWITCHER === "1";

/**
 * Dev-only theme switcher for checking every theme visually. Shown in
 * `next dev`, or in a production build made with NEXT_PUBLIC_THEME_SWITCHER=1
 * (so it can be checked under `next build && next start`).
 */
export const ThemeSwitcher = ENABLED ? Switcher : () => null;

function Switcher() {
  const current = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Theme (dev)"
      // Above the mobile bottom nav (h-16), clear of the timer's touch area.
      className="fixed bottom-20 left-3 z-50 flex gap-0.5 rounded-full border border-border bg-popover/90 p-0.5 text-xs text-popover-foreground shadow-lg backdrop-blur md:bottom-3"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          onClick={(e) => {
            // The timer listens for clicks/keys on window; keep the switcher out of it.
            e.stopPropagation();
            setTheme(value);
          }}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            current === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
