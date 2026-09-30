# CubeUniverse Design Token Spec (Step 3)

> **Status:** approved 1 Oct 2026, with the review decisions folded in (see *Review decisions* at the end). Implemented in `src/app/globals.css` and, from phase 2, `src/themes/`.

Oct 1, 2026 · @Sumit Garad

## Purpose and scope

Step 3 delivers a named vocabulary of design tokens and two themes that use it, so the Timer and Drill Lab redesign (step 6) is built on tokens from day one. It is a written spec, not a mockup and not a UI build.

**In scope**

- Every colour, font, type size, spacing step, radius, shadow and motion duration named by role.
- Values for two deliberately different themes: Slate (dark default) and Paper (warm light).
- Contrast rules, the theme file format, and a CI guard against new hardcoded colours.

**Out of scope**

- Redesigning screens (step 6), the theme settings page and `user_settings` sync (step 8), the Drill Lab spec (step 4).
- Rewriting all existing hardcoded classes. Old components migrate when the redesign touches them.

**Done when:** this spec is reviewed, `globals.css` implements it for both themes, and CI fails any new raw colour in a changed file.

## Current state audit

The architecture is already right: `src/app/globals.css` defines shadcn role tokens on `:root`, overrides them in `.dark`, and maps them into Tailwind v4 through `@theme inline`. The gaps are coverage and naming, not structure. Figures below are from a scan of the main branch on 1 Oct 2026.

| Area | What exists | Gap |
| --- | --- | --- |
| Core colour roles | background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, sidebar-\* | No success or warning roles; no raised or overlay surface |
| Timer states | timer-hold, timer-ready, timer-holding, timer-running | Good; keep. Needs values per theme and a contrast rule |
| Charts | chart-1..5, chart-seq-0..4, validated for CVD and contrast | Good; keep as is |
| Learn page | learn-bg, learn-teal, learn-purple (39 usages) | Named after a page and a hue; defined only in `.dark`, so any other theme breaks |
| Cube stickers | Hex constants in `facelet-viewer.tsx` (U yellow, F green, D white, B blue, L red, R orange, X grey) plus `#111827` stroke | No tokens; blocks custom colour schemes |
| Typography | Geist Sans and Geist Mono via `next/font` | No timer font token; no type scale; timer size is ad hoc (`text-7xl md:text-8xl`) |
| Spacing, elevation, motion | Tailwind defaults; `--layout-gap` for the timer grid | No named scale |
| Hardcoded colour in components | About 216 raw palette classes and 46 hex values in `.tsx` | Concentrated in learn (`facelet-viewer`, `puzzle-card`, `puzzle-hero`) and `admin/cube-painter` |

## Naming rules

A token is named for the job it does, never for how it looks in one theme.

1. Role, not hue: `--accent`, not `--teal`; `--surface-raised`, not `--slate-800`.
2. Role, not page: `--timer-digits`, not `--learn-teal`. A page may get its own token only when no shared role fits.
3. Keep the shadcn names. They are what `components/ui` already reads; adding a parallel naming scheme doubles the work.
4. Pairs travel together: every fill token that holds text has a matching `-foreground` token.
5. Only two layers. Theme files set raw values on role tokens; components use role tokens. No component ever reads a raw value.
6. Tailwind exposure: every colour token gets a `--color-*` alias in `@theme inline`, so `bg-surface-raised` and `text-timer-digits` work as utilities.

## Colour tokens

The colour set keeps every existing shadcn, timer and chart token and adds 19 new ones. New tokens are marked in the Status column.

| Group | Token | Role | Status |
| --- | --- | --- | --- |
| Surfaces | `--background` | Page canvas | Existing |
| Surfaces | `--card` / `--popover` | Panels, menus | Existing |
| Surfaces | `--surface-raised` | Panel above a card (drill case tile, modal body) | New |
| Surfaces | `--surface-overlay` | Scrim behind modals and over background images | New |
| Text | `--foreground` | Body text | Existing |
| Text | `--muted-foreground` | Secondary text, labels | Existing |
| Text | `--foreground-subtle` | Hints, disabled text, timestamps | New |
| Accent | `--primary` / `--primary-foreground` | Brand accent, main actions | Existing |
| Accent | `--accent-2` / `--accent-2-foreground` | Secondary highlight (replaces `--learn-purple`) | New |
| Lines | `--border`, `--input`, `--ring` | Borders, inputs, focus ring | Existing |
| States | `--destructive` | Errors, DNF | Existing |
| States | `--success` / `--success-foreground` | PB, correct, saved | New |
| States | `--warning` / `--warning-foreground` | +2, slow case, caution | New |
| Timer | `--timer-digits` | Idle and stopped digits | New |
| Timer | `--timer-holding`, `--timer-ready`, `--timer-running`, `--timer-hold` | Solve states | Existing |
| Timer | `--timer-scrim` | Auto-applied behind digits when contrast fails | New |
| Charts | `--chart-1..5`, `--chart-seq-0..4` | Data series and heatmap | Existing, unchanged |
| Cube | `--sticker-u`, `-d`, `-f`, `-b`, `-l`, `-r` | Face colours by face, not by colour name | New (6) |
| Cube | `--sticker-masked`, `--sticker-outline` | Masked sticker, piece outline | New (2) |

Sticker tokens are named by face so a user colour scheme (for example yellow-top vs white-top) is just an override of these six. The current scheme in `facelet-viewer.tsx` becomes their default values.

## Typography, spacing, radius, elevation, motion

The timer gets its own font and size tokens because that is the setting cubers actually change.

**Fonts**

| Token | Default | Notes |
| --- | --- | --- |
| `--font-ui` | Geist Sans | All interface text |
| `--font-mono` | Geist Mono | Scrambles, algorithms, stats tables |
| `--font-timer` | Geist Mono | Timer digits only; user-selectable. Must support tabular numerals |

**Type scale** (rem, fluid where marked)

| Token | Size | Use |
| --- | --- | --- |
| `--text-xs` | 0.75 | Captions, chart axes |
| `--text-sm` | 0.875 | Labels, table cells |
| `--text-base` | 1 | Body |
| `--text-lg` | 1.25 | Card titles *(deferred to step 6)* |
| `--text-xl` | 1.5 | Section headings *(deferred to step 6)* |
| `--text-2xl` | 2 | Page headings *(deferred to step 6)* |
| `--text-scramble` | clamp(1rem, 2.5vw, 1.5rem) | Scramble line |
| `--text-timer` | clamp(4.5rem, 14vw, 9rem) | Timer digits; scaled by `user_settings.timer_font_size` |

Only `--text-scramble` and `--text-timer` ship in step 3. `--text-xs` to `--text-2xl` share Tailwind's own theme variable names, so defining them would resize every existing `text-lg`, `text-xl`, and so on across the site. They are deferred to the step 6 redesign.

**Spacing:** keep Tailwind's 4px base (`--spacing: 0.25rem`) and add density tokens `--space-panel` (16px comfortable, 12px compact) and `--layout-gap` (8px, already used by the timer grid). Density switches only these two.

**Radius:** keep `--radius: 0.5rem` and its derived `sm` to `4xl` steps. Themes may change `--radius` only.

**Elevation:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`. Dark themes use border contrast more than shadow, so values differ per theme. *Deferred to step 6.* The names collide with Tailwind's shadow scale, so defining them now would restyle every shadcn shadow.

**Motion:** `--duration-fast` 120ms, `--duration-base` 200ms, `--ease-standard` cubic-bezier(0.2, 0, 0, 1). All motion respects `prefers-reduced-motion`. Timer colour transitions stay at 150ms or less so state changes feel instant.

## The two themes

Slate (dark default) and Paper (warm light) are designed together so every token is tested against two very different canvases. Slate reuses the existing `.dark` values; where the table shows hex, the existing oklch value in `globals.css` stays authoritative. Contrast figures are WCAG ratios against `--background`, computed 1 Oct 2026.

| Token | Slate | Contrast | Paper | Contrast |
| --- | --- | --- | --- | --- |
| `--background` | #0F172A | — | #F6F1E7 | — |
| `--card` | #1E293B | — | #FFFBF3 | — |
| `--surface-raised` | #273449 | — | #EFE7D8 | — |
| `--surface-overlay` | #0F172A at 72% | — | #2B2118 at 40% | — |
| `--foreground` | #F8FAFC | 17.1 | #2B2118 | 14.0 |
| `--muted-foreground` | #94A3B8 | 7.0 | #6B5E4E | 5.6 |
| `--foreground-subtle` | #8A99AF | 6.2 | #716352 | 5.2 |
| `--primary` | #00D4AA | 9.4 | #A94016 | 5.4 |
| `--primary-foreground` | #0F172A | 9.4 on primary | #FFFBF3 | 5.9 on primary |
| `--accent-2` | #A48EFF | 6.7 | #2F6B5B | 5.5 |
| `--accent-2-foreground` | #0F172A | 6.7 on accent-2 | #FFFBF3 | 6.0 on accent-2 |
| `--success` | #34D399 | 9.3 | #216F45 | 5.5 |
| `--success-foreground` | #0F172A | 9.3 on success | #FFFBF3 | 5.9 on success |
| `--warning` | #FBBF24 | 10.7 | #8C520A | 5.6 |
| `--warning-foreground` | #0F172A | 10.7 on warning | #FFFBF3 | 6.1 on warning |
| `--destructive` | #F87171 | 6.5 | #B42318 | 5.8 |
| `--border` | #F8FAFC at 10% | — | #E3D9C6 | — |
| `--timer-digits` | #F8FAFC | 17.1 | #2B2118 | 14.0 |
| `--timer-holding` | #EF4444 | 4.7 | #C0341D | 5.0 |
| `--timer-running` | #4ADE80 | 10.3 | #1A7340 | 5.2 |
| `--timer-scrim` | #0F172A at 72% | — | #F6F1E7 at 72% | — |
| `--font-timer` | Geist Mono | — | JetBrains Mono | — |
| `--radius` | 0.5rem | — | 0.75rem | — |

Chart tokens keep their existing validated values in both themes: Paper uses the current light-mode set, which was validated against white and must be re-checked against #F6F1E7. Sticker tokens are identical in both themes.

Two values were adjusted to pass: Slate `--accent-2-foreground` moved from white (3.7) to dark ink, and Paper `--timer-running` darkened from #1F7F47 (4.5) to #1A7340.

Review (1 Oct 2026) adjusted four more so that status colours pass as text on `--card` and `--surface-raised` as well as on `--background`:

| Token | Theme | Was | Now | Failing pair |
| --- | --- | --- | --- | --- |
| `--accent-2` | Slate | #8B6CFF | #A48EFF | 3.4 on raised |
| `--primary` | Paper | #B4461A | #A94016 | 4.46 on raised |
| `--warning` | Paper | #9A5B0B | #8C520A | 4.41 on raised |
| `--success` | Paper | #23764A | #216F45 | margin |
| `--destructive` | Slate | oklch(0.704 0.191 22.216) | oklch(0.73 0.191 22.216) | 4.34 on raised (found by the contrast test; the spec's #F87171 hex had hidden it) |

## Theme format, contrast rules and guardrails

A theme is a small declarative object of token overrides, applied as a `[data-theme]` attribute on `<html>`, so community themes can arrive as a pull request.

```ts
// src/themes/paper.ts
export const paper = {
  id: "paper",
  name: "Paper",
  mode: "light",           // drives shadcn dark: variants and color-scheme
  tokens: {
    background: "#F6F1E7",
    foreground: "#2B2118",
    primary: "#B4461A",
    "timer-digits": "#2B2118",
    "font-timer": "'JetBrains Mono', monospace",
    radius: "0.75rem",
    // ...only tokens that differ from the base
  },
} satisfies ThemeDefinition; // `Theme` is taken by src/lib/theme.ts
```

A test generates the `[data-theme="paper"] { … }` CSS block from these objects and compares it with a checked-in `src/themes/themes.generated.css`, a Vitest file snapshot regenerated with `vitest -u`, so the TypeScript type is the single source of truth and a theme missing a required token fails to compile.

**Contrast rules**

- Body text (`--foreground`, `--muted-foreground`), `-foreground` pairs, and status colours used as text (`--primary`, `--accent-2`, `--success`, `--warning`, `--destructive`): at least 4.5:1 on `--background`, `--card` and `--surface-raised`.
- `--foreground-subtle`: at least 4.5:1 on `--background` and `--card` only. It is **never used on `--surface-raised`**, and the test checks only those two surfaces.
- Timer digits and timer state colours: at least 3:1 (large-text threshold) on the timer background, including any user background image.
- When a user background drops timer contrast below 3:1, apply `--timer-scrim` behind the digits automatically. *Applied automatically on `/timer` when a background image is set: `src/lib/timer-background/scrim.ts` tests the image's 10th and 90th luminance percentiles, after the user's brightness and opacity are applied, against every timer colour.*
- A unit test computes these ratios for every registered theme and fails CI on any miss.

**Guardrails**

- A CI check scans the added lines of changed `.ts` and `.tsx` files outside `src/themes/`. It fails on raw palette classes (`bg-slate-800`, `text-teal-400`), on `white` and `black` classes (`text-white`, `bg-white/5`, `border-white/10`), on arbitrary colours (`bg-[#…]`, `rgba(…)`), and on hex literals.
- The `cubehub-theme` cookie is the single source of truth for the theme; localStorage is not used.
  - The cookie holds `slate`, `paper` or `system`. Legacy values are still read: `dark` means Slate and `light` means Paper.
  - The server renders `data-theme` and `.dark` from the cookie.
  - A tiny inline `<head>` script does work only for `system`. It resolves `prefers-color-scheme` before first paint, so there is no flash of unthemed content.
- `next-themes` or the existing `.dark` class keeps working: `mode` sets it, so shadcn `dark:` variants stay valid.

## Migration and done checklist

Only three existing token names change; everything else is additive.

| Old | New | Note |
| --- | --- | --- |
| `--learn-bg` | `--background` (page canvases) / `--card` (panels) | Check each of the 39 usages; pick by role |
| `--learn-teal` | `--primary` | Same job as the brand accent |
| `--learn-purple` | `--accent-2` | Now defined in every theme |
| `:root` light values | Kept as an internal light base | Paper overrides it; never shipped as a user theme. The existing **Light** setting now means Paper |
| `.dark` values | Slate theme | `.dark` class stays for shadcn variants |
| Sticker hex in `facelet-viewer.tsx` and `admin/cube-painter.tsx` | `--sticker-*` | Migrate now: small files, unblocks colour schemes. The painter had L and R swapped (a bug); it now uses the same tokens |

- [x] Spec reviewed and values confirmed
- [x] New tokens added to `:root`, Slate and Paper, with `@theme inline` aliases
- [x] `src/themes/` objects plus the CSS generation step
- [x] Contrast unit test passing for both themes (`tests/unit/theme-contrast.test.ts`, rules in `src/themes/contrast-rules.ts`)
- [x] No-FOUC head script (resolves `system`; the cookie is the source of truth)
- [x] CI guard for new hardcoded colours (`npm run check:colors`, scripts/check-colors.mjs)
- [x] `learn-*` tokens and sticker hex migrated (shared map in `src/lib/stickers.ts`)
- [x] Timer page renders correctly in both themes (`npm run build && npx next start`; dev switcher via `NEXT_PUBLIC_THEME_SWITCHER=1`)

## Review decisions (1 Oct 2026)

1. The Light and Dark settings map to Paper and Slate. The `:root` base stays internal.
2. `--learn-bg` becomes `--card` for panels and `--background` for full-page canvases.
3. Tailwind's `text-*` and `shadow-*` scales are not redefined. Only `--text-scramble` and `--text-timer` ship; shadow tokens wait for step 6.
4. Values were fixed instead of relaxing the rules. Status colours pass 4.5:1 on all three surfaces, and `--foreground-subtle` is barred from `--surface-raised`.
5. The colour guard also flags `white` and `black` classes.
6. Sticker colours move to `--sticker-*` in both the viewer and the painter; the painter's L/R swap was a bug.
7. The cookie is the single source of truth for the theme, with no localStorage.
8. `--timer-scrim` is defined and tested but not applied automatically yet.
9. The colour guard scans `.ts` as well as `.tsx`.
