/**
 * Contrast rules from docs/design-tokens.md, as data. The contrast test
 * (tests/unit/theme-contrast.test.ts) checks every registered theme against
 * every rule. Deciding which tokens count as "text" is a judgement call, so
 * it lives here, in one reviewable place.
 */
import type { TokenName } from "./types";

export interface ContrastRule {
  /** Why the rule exists, shown in the test name. */
  label: string;
  min: number;
  pairs: ReadonlyArray<readonly [fg: TokenName, bg: TokenName]>;
}

const SURFACES = ["background", "card", "surface-raised"] as const satisfies readonly TokenName[];

const on = (fgs: readonly TokenName[], bgs: readonly TokenName[]) =>
  fgs.flatMap((fg) => bgs.map((bg) => [fg, bg] as const));

export const CONTRAST_RULES: readonly ContrastRule[] = [
  {
    label: "body text on every surface (4.5:1)",
    min: 4.5,
    pairs: on(["foreground", "muted-foreground"], SURFACES),
  },
  {
    // Status colours double as text (PB, +2, DNF, links), so they must read
    // as text wherever they can land.
    label: "status colours as text on every surface (4.5:1)",
    min: 4.5,
    pairs: on(["primary", "accent-2", "success", "warning", "destructive"], SURFACES),
  },
  {
    // Review decision: subtle text is never used on surface-raised.
    label: "subtle text on background and card (4.5:1)",
    min: 4.5,
    pairs: on(["foreground-subtle"], ["background", "card"]),
  },
  {
    label: "-foreground on its fill (4.5:1)",
    min: 4.5,
    pairs: [
      ["primary-foreground", "primary"],
      ["secondary-foreground", "secondary"],
      ["accent-foreground", "accent"],
      ["accent-2-foreground", "accent-2"],
      ["success-foreground", "success"],
      ["warning-foreground", "warning"],
      ["card-foreground", "card"],
      ["popover-foreground", "popover"],
      ["muted-foreground", "muted"],
      ["sidebar-foreground", "sidebar"],
      ["sidebar-primary-foreground", "sidebar-primary"],
      ["sidebar-accent-foreground", "sidebar-accent"],
    ],
  },
  {
    // Large-text threshold. The timer panel sits on a card, so check both.
    label: "timer digits and states (3:1)",
    min: 3,
    pairs: on(
      ["timer-digits", "timer-holding", "timer-running", "timer-ready", "timer-hold"],
      ["background", "card"],
    ),
  },
  {
    // WCAG 1.4.11 non-text contrast for chart marks, against the canvas the
    // chart palettes were validated on.
    label: "chart series on background (3:1)",
    min: 3,
    pairs: on(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"], ["background"]),
  },
];

/**
 * The scrim must rescue the timer over any user background image. Worst
 * cases are pure black and pure white images; digits must still reach 3:1
 * on the scrim composited over each.
 */
export const SCRIM_MIN = 3;
