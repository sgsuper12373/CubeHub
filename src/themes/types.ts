/**
 * Theme types — the single source of truth for CubeUniverse design tokens.
 * See docs/design-tokens.md.
 *
 * Two layers only: a theme sets raw values on role tokens; components use the
 * role tokens (via Tailwind utilities or `var(--token)`), never raw values.
 * `themes.generated.css` is generated from these objects by
 * tests/unit/themes-css.test.ts — edit the .ts files, then run
 * `npx vitest run -u` to regenerate it.
 */

/** Every token a theme may set, in the order the generated CSS emits them. */
export const TOKEN_NAMES = [
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-seq-0",
  "chart-seq-1",
  "chart-seq-2",
  "chart-seq-3",
  "chart-seq-4",
  "radius",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "background",
  "foreground",
  "timer-hold",
  "timer-ready",
  "timer-holding",
  "timer-running",
  "surface-raised",
  "surface-overlay",
  "foreground-subtle",
  "accent-2",
  "accent-2-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "timer-digits",
  "timer-scrim",
  "sticker-u",
  "sticker-d",
  "sticker-f",
  "sticker-b",
  "sticker-l",
  "sticker-r",
  "sticker-masked",
  "sticker-outline",
  "space-panel",
  "layout-gap",
  "duration-fast",
  "duration-base",
  "learn-bg",
  "learn-teal",
  "learn-purple",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

export type Tokens = Record<TokenName, string>;

/**
 * Tokens every theme must set itself (the rows of the theme table in the
 * spec). Leaving one out is a compile error; every other token falls back to
 * the base.
 */
export type CoreToken =
  | "background"
  | "foreground"
  | "card"
  | "surface-raised"
  | "surface-overlay"
  | "muted-foreground"
  | "foreground-subtle"
  | "primary"
  | "primary-foreground"
  | "accent-2"
  | "accent-2-foreground"
  | "success"
  | "success-foreground"
  | "warning"
  | "warning-foreground"
  | "destructive"
  | "border"
  | "timer-digits"
  | "timer-holding"
  | "timer-running"
  | "timer-scrim"
  | "radius";

export type ThemeMode = "light" | "dark";

/**
 * Named `ThemeDefinition` (not `Theme`) because `Theme` is the user's
 * preference type in src/lib/theme.ts.
 */
export interface ThemeDefinition {
  id: string;
  name: string;
  /** Drives the `.dark` class (shadcn `dark:` variants) and `color-scheme`. */
  mode: ThemeMode;
  tokens: Pick<Tokens, CoreToken> & Partial<Tokens>;
}

/**
 * Page-and-hue tokens being migrated away (step 3, phase 7). They were only
 * ever defined for the dark theme, so the base carries no value for them.
 */
export type LegacyToken = "learn-bg" | "learn-teal" | "learn-purple";

/** The internal light base emitted on `:root`. Not a user-selectable theme. */
export interface BaseTheme {
  mode: ThemeMode;
  tokens: Omit<Tokens, LegacyToken>;
}
