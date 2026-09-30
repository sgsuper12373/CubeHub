import type { BaseTheme } from "./types";

/**
 * The internal light base, emitted on `:root`. Every token has a value here so
 * a theme only lists what it changes. Not shipped as a user theme — the Light
 * setting maps to Paper.
 */
export const base = {
  mode: "light",
  tokens: {
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.55 0.12 174)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.55 0.12 174)",
    // Chart series — light mode. Slots 1-3 are the categorical hues, assigned in
    // fixed order and never cycled; 4-5 are the de-emphasis greys that context
    // marks (raw singles) wear. These are their own steps from the brand ramps,
    // not the UI accent reused: the accent sits outside the lightness band a
    // chart mark has to hold. Validated (lightness, chroma, CVD separation,
    // normal-vision floor, surface contrast) against #ffffff — all pass.
    "chart-1": "oklch(0.6 0.13 171.7)",
    "chart-2": "oklch(0.65 0.16 58)",
    "chart-3": "oklch(0.55 0.2 295)",
    "chart-4": "oklch(0.556 0 0)",
    "chart-5": "oklch(0.439 0 0)",
    // Sequential ramp (heatmap): one hue, light → dark as the value grows.
    "chart-seq-0": "oklch(0.94 0.005 250)",
    "chart-seq-1": "oklch(0.85 0.06 171.7)",
    "chart-seq-2": "oklch(0.72 0.1 171.7)",
    "chart-seq-3": "oklch(0.6 0.13 171.7)",
    "chart-seq-4": "oklch(0.48 0.12 171.7)",
    // Subtle 8px corners — a sharp, fast aesthetic (see design brief).
    radius: "0.5rem",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.97 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.708 0 0)",
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    // Timer state palette (see docs/roadmap.md Phase 1 + the design brief).
    // `--timer-hold` (red) and `--timer-ready` (teal) are theme-tracking aliases;
    // `--timer-hold` stays the destructive/penalty red (inspection overrun, +2/DNF),
    // `--timer-ready` is the teal "result/accent" colour (stopped digits, Best tile).
    // The two solve-in-progress colours are fixed hues that read well on any bg:
    // holding → warm orange (arming), running/armed → bright green (go).
    "timer-hold": "var(--destructive)",
    "timer-ready": "var(--primary)",
    "timer-holding": "oklch(0.6 0.25 29.23)", // Red
    "timer-running": "oklch(0.82 0.19 152)",
    // ── Step 3 role tokens (docs/design-tokens.md) ──
    // :root is the internal light base; users get Slate or Paper.
    "surface-raised": "oklch(0.97 0 0)",
    "surface-overlay": "oklch(0.145 0 0 / 40%)",
    "foreground-subtle": "oklch(0.556 0 0)",
    "accent-2": "oklch(0.491 0.241 292.6)",
    "accent-2-foreground": "oklch(0.985 0 0)",
    success: "oklch(0.527 0.137 150.1)",
    "success-foreground": "oklch(0.985 0 0)",
    warning: "oklch(0.555 0.146 49)",
    "warning-foreground": "oklch(0.985 0 0)",
    "timer-digits": "var(--foreground)",
    // Defined now, auto-applied later (behind digits over a user background
    // image, when contrast drops below 3:1).
    "timer-scrim": "oklch(1 0 0 / 72%)",
    // Cube stickers, named by face so a colour scheme is an override of six
    // tokens. Default: yellow top, green front. Identical in every theme.
    "sticker-u": "#eab308",
    "sticker-d": "#ffffff",
    "sticker-f": "#22c55e",
    "sticker-b": "#3b82f6",
    "sticker-l": "#ef4444",
    "sticker-r": "#f97316",
    "sticker-masked": "#374151",
    "sticker-outline": "#111827",
    // Density: only these two switch between comfortable and compact.
    "space-panel": "16px",
    "layout-gap": "8px",
    // Motion. Timer colour transitions stay at or under 150ms.
    "duration-fast": "120ms",
    "duration-base": "200ms",
  },
} satisfies BaseTheme;
