import type { ThemeDefinition } from "./types";

/**
 * Paper — warm light. Every shadcn token is set, not just the spec's table,
 * so nothing falls through to the grey base. Charts reuse the base light set.
 */
export const paper = {
  id: "paper",
  name: "Paper",
  mode: "light",
  tokens: {
    background: "oklch(0.959 0.014 84.6)", // #F6F1E7
    foreground: "oklch(0.257 0.022 63.6)", // #2B2118
    card: "oklch(0.989 0.011 84.6)", // #FFFBF3
    "card-foreground": "oklch(0.257 0.022 63.6)",
    popover: "oklch(0.989 0.011 84.6)",
    "popover-foreground": "oklch(0.257 0.022 63.6)",
    "surface-raised": "oklch(0.93 0.022 83.3)", // #EFE7D8
    "surface-overlay": "oklch(0.257 0.022 63.6 / 40%)",
    primary: "oklch(0.511 0.148 39.7)", // #A94016
    "primary-foreground": "oklch(0.989 0.011 84.6)",
    secondary: "oklch(0.93 0.022 83.3)",
    "secondary-foreground": "oklch(0.257 0.022 63.6)",
    muted: "oklch(0.93 0.022 83.3)",
    "muted-foreground": "oklch(0.49 0.03 72.8)", // #6B5E4E
    "foreground-subtle": "oklch(0.508 0.031 72.4)", // #716352 — never on surface-raised
    accent: "oklch(0.93 0.022 83.3)",
    "accent-foreground": "oklch(0.257 0.022 63.6)",
    "accent-2": "oklch(0.483 0.068 173.4)", // #2F6B5B
    "accent-2-foreground": "oklch(0.989 0.011 84.6)",
    success: "oklch(0.483 0.101 155.6)", // #216F45
    "success-foreground": "oklch(0.989 0.011 84.6)",
    warning: "oklch(0.495 0.109 63.4)", // #8C520A
    "warning-foreground": "oklch(0.989 0.011 84.6)",
    destructive: "oklch(0.5 0.182 29.5)", // #B42318
    border: "oklch(0.888 0.028 83.5)", // #E3D9C6
    input: "oklch(0.843 0.034 83.7)",
    ring: "oklch(0.511 0.148 39.7)",
    sidebar: "oklch(0.989 0.011 84.6)",
    "sidebar-foreground": "oklch(0.257 0.022 63.6)",
    "sidebar-primary": "oklch(0.511 0.148 39.7)",
    "sidebar-primary-foreground": "oklch(0.989 0.011 84.6)",
    "sidebar-accent": "oklch(0.93 0.022 83.3)",
    "sidebar-accent-foreground": "oklch(0.257 0.022 63.6)",
    "sidebar-border": "oklch(0.888 0.028 83.5)",
    "sidebar-ring": "oklch(0.511 0.148 39.7)",
    "timer-digits": "var(--foreground)",
    "timer-holding": "oklch(0.537 0.18 32)", // #C0341D
    "timer-running": "oklch(0.492 0.115 153)", // #1A7340
    "timer-scrim": "oklch(0.959 0.014 84.6 / 72%)",
    radius: "0.75rem",
    // JetBrains Mono is declared with preload: false, so its file is only
    // fetched when something renders in it — i.e. only while Paper is active.
    "font-timer": "var(--font-jetbrains-mono), var(--font-geist-mono), monospace",
  },
} satisfies ThemeDefinition;
