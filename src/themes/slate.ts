import type { ThemeDefinition } from "./types";

/** Slate — the dark default. Formerly the `.dark` block in globals.css. */
export const slate = {
  id: "slate",
  name: "Slate",
  mode: "dark",
  tokens: {
    // Deep slate canvas + electric-teal accent (design brief §1).
    // Hex anchors: bg slate-900 #0F172A · surface slate-800 #1E293B ·
    // text slate-50 #F8FAFC · muted slate-400 #94A3B8 · accent #00D4AA.
    background: "oklch(0.208 0.04 265.8)",
    foreground: "oklch(0.984 0.003 247.9)",
    card: "oklch(0.279 0.037 260)",
    "card-foreground": "oklch(0.984 0.003 247.9)",
    popover: "oklch(0.279 0.037 260)",
    "popover-foreground": "oklch(0.984 0.003 247.9)",
    primary: "oklch(0.775 0.151 171.7)",
    // Dark text on the bright teal — ~8:1 contrast (white would be ~1.7:1).
    "primary-foreground": "oklch(0.208 0.04 265.8)",
    secondary: "oklch(0.32 0.036 259)",
    "secondary-foreground": "oklch(0.984 0.003 247.9)",
    muted: "oklch(0.32 0.036 259)",
    "muted-foreground": "oklch(0.711 0.035 256.8)",
    accent: "oklch(0.32 0.036 259)",
    "accent-foreground": "oklch(0.984 0.003 247.9)",
    // Lightened from L 0.704 (4.34:1 on surface-raised) to pass 4.5:1 as text
    // on every surface (step 3 contrast test).
    destructive: "oklch(0.73 0.191 22.216)",
    border: "oklch(0.98 0.01 250 / 10%)",
    input: "oklch(0.98 0.01 250 / 15%)",
    ring: "oklch(0.775 0.151 171.7)",
    // Chart series — dark mode. Selected for the slate surface, not flipped from
    // light: the accent teal (L 0.775) sits above the band a dark-mode mark may
    // occupy, so the chart step is deeper. Validated against #0f172a — all six
    // checks pass, worst all-pairs ΔE 12.5 deutan / 24.3 normal.
    "chart-1": "oklch(0.66 0.14 171.7)",
    "chart-2": "oklch(0.65 0.16 58)",
    "chart-3": "oklch(0.62 0.19 295)",
    "chart-4": "oklch(0.711 0.035 256.8)",
    "chart-5": "oklch(0.554 0.041 257.4)",
    // Sequential ramp (heatmap): dim → bright as the value grows, because on a
    // dark canvas "more" reads as more light, not more ink.
    "chart-seq-0": "oklch(0.32 0.036 259)",
    "chart-seq-1": "oklch(0.42 0.06 171.7)",
    "chart-seq-2": "oklch(0.52 0.1 171.7)",
    "chart-seq-3": "oklch(0.62 0.13 171.7)",
    "chart-seq-4": "oklch(0.74 0.15 171.7)",
    sidebar: "oklch(0.279 0.037 260)",
    "sidebar-foreground": "oklch(0.984 0.003 247.9)",
    "sidebar-primary": "oklch(0.775 0.151 171.7)",
    "sidebar-primary-foreground": "oklch(0.208 0.04 265.8)",
    "sidebar-accent": "oklch(0.32 0.036 259)",
    "sidebar-accent-foreground": "oklch(0.984 0.003 247.9)",
    "sidebar-border": "oklch(0.98 0.01 250 / 10%)",
    "sidebar-ring": "oklch(0.775 0.151 171.7)",
    // ── Step 3 role tokens (Slate) ──
    "surface-raised": "oklch(0.323 0.042 259.8)", // #273449
    "surface-overlay": "oklch(0.208 0.04 265.8 / 72%)",
    "foreground-subtle": "oklch(0.679 0.037 257.9)", // #8A99AF — never on surface-raised
    "accent-2": "oklch(0.714 0.161 290.7)", // #A48EFF
    "accent-2-foreground": "oklch(0.208 0.04 265.8)",
    success: "oklch(0.773 0.153 163.2)", // #34D399
    "success-foreground": "oklch(0.208 0.04 265.8)",
    warning: "oklch(0.837 0.164 84.4)", // #FBBF24
    "warning-foreground": "oklch(0.208 0.04 265.8)",
    // Timer states and radius are listed explicitly (not inherited from the
    // base) so each theme's contrast is reviewed on its own canvas.
    "timer-digits": "var(--foreground)",
    "timer-holding": "oklch(0.6 0.25 29.23)",
    "timer-running": "oklch(0.82 0.19 152)",
    radius: "0.5rem",
    "font-timer": "var(--font-geist-mono)",
    "timer-scrim": "oklch(0.208 0.04 265.8 / 72%)",
  },
} satisfies ThemeDefinition;
