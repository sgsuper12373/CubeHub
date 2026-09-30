# Implementation Log

A running record of code changes made to the repository, one entry per change request.
Newest entries at the top.

---

## 2026-10-01 — Learn pages fully themed; guard gaps and CTA link fixed

**Request:** Fix the white text on the learn pages in Paper ("Learn. Practice." was barely visible) and check whether anything else remains.

**Changed**
- **All learn routes and `src/components/learn/*`**: the remaining 79 raw colours, plus 4 found after tightening the guard.
  - `text-white` → `text-foreground`, including the hero headings, card titles and stat labels.
  - `border-white/*` → `border-border`; `hover:border-white/10` → `hover:border-foreground/20`.
  - `bg-white/[x]` → `bg-foreground/[x]`. Identical on Slate, and a matching subtle tint on Paper.
  - `bg-black/20|30` (the algorithm card's case well and expanded area) → `bg-background/60|80`, recessed in both themes.
  - `text-green-400|500` for learned or completed → `text-success`.
  - The amber access badge, the blue difficulty icon and the yellow rating star → `warning`.
  - The grid-line backgrounds `#80808012` → `color-mix(in oklch, var(--foreground) 7%, transparent)`.
  - Mask `#000` → `black` (alpha only).
  - The cube image's black drop shadow → `color-mix(in oklch, black 80%, transparent)`.
- **`algorithm-card.tsx`**: the hover glow was `rgba(var(--primary),0.3)`, which is invalid because `--primary` is oklch, so it never rendered. It is now `color-mix(...)`.
- **CTA bug** (`cta-section.tsx`, `learn/[puzzle]/page.tsx`)
  - "Start Beginner Method" linked to a hardcoded `/learn/<puzzle>/beginner-method`, which 404s; the series slug is `beginner`.
  - The page now passes the puzzle's first tutorial series, which is ordered by `order_index`. The CTA is hidden when the puzzle has none (2x2 today) instead of linking to a 404.
- **`scripts/check-colors.mjs`**: two gaps fixed, both caused by Tailwind's `_` space separator being a word character.
  - Hex followed by `_` (e.g. `#80808012_1px`) was missed.
  - `_rgba(0,…)` was missed because of the `\b` boundary.
  - Fixture tests were added for both.

**Kept on purpose**
- `mix-blend-screen` glows are left as they are (not a colour); they are simply faint on Paper.
- The black 404 page is Next's default `not-found`, which follows the OS colour scheme, not our theme. There is no custom `not-found.tsx` yet.

**Verified**
- `npm run validate` passes (189 tests). `npm run check:colors` is OK. A rescan of every learn file finds 0 raw colours.
- `NEXT_PUBLIC_THEME_SWITCHER=1 npm run build && npx next start`:
  - In Paper, `/learn`, `/learn/333`, `/learn/333/oll` and `/learn/333/beginner` all read correctly: headings, card titles, stat labels, grids and badges.
  - Slate looks as before, except the grid lines are a touch brighter.
  - The CTA links to `/learn/333/beginner`; `/learn/222` shows no CTA.

---

## 2026-10-01 — Step 3, Phase 8: temporary dev theme switcher

**Request:** Phase 8 of the design-token plan: a temporary dev-only switcher so both themes can be checked visually, including under `npm run build && npx next start`.

**Changed**
- **New: `src/components/dev/theme-switcher.tsx`** (marked `TEMP(step 8)`)
  - A fixed pill in the bottom-left with Slate | Paper | System, built from `THEMES`. It calls `setTheme()` and reads the current value through the existing `useSyncExternalStore` plumbing.
  - It sits above the mobile bottom nav and stops click propagation, so it can't start the timer.
  - It only exists when `NODE_ENV === "development"` or `NEXT_PUBLIC_THEME_SWITCHER === "1"`. Both are inlined at build time, so otherwise it is a no-op and its code is removed by the minifier.
- **`src/app/layout.tsx`**: renders `<ThemeSwitcher />`.
- **`next.config.ts`**: `env.NEXT_PUBLIC_THEME_SWITCHER` defaults to `""`. Without that, an unset `NEXT_PUBLIC_` variable is left as a runtime `process.env` lookup and is never folded, which kept the disabled switcher in the shared layout chunk every page loads. Found by grepping the build.
- **`.env.example`**: documents the flag.
- `docs/design-tokens.md`: the whole done checklist is ticked.

**Verified**
- `npm run validate` passes (187 tests); `check:colors` is OK.
- `npm run build` **without** the flag: `Theme (dev)` appears in 0 client chunks. Before the `next.config` fix, it was in the 33 KB shared chunk that `/`, `/timer`, `/learn` and `/settings` load.
- `NEXT_PUBLIC_THEME_SWITCHER=1 npm run build && npx next start`:
  - The switcher shows on `/timer`, and clicking it switches theme without touching the timer.
  - Idle digits are the foreground colour, and holding turns each theme's red. Released early, so no solve was recorded on the signed-in account; running and ready are checked via their tokens and the contrast test.
  - The timer font is JetBrains Mono on Paper and Geist Mono on Slate.
  - `/learn` was already checked in Phase 7.

---

## 2026-10-01 — Step 3, Phase 7: migrate `learn-*` tokens and sticker colours

**Request:** Phase 7 of the design-token plan: replace the page-and-hue `learn-*` tokens with role tokens and move the sticker hex values onto `--sticker-*`.

**Changed**
- **Learn pages and components**: `learn/page.tsx`, `learn/[puzzle]/page.tsx`, `series-card`, `feature-section`, `filter-bar`, `hero-section`, `cta-section`, `puzzle-hero`, `puzzle-card`, and `puzzle-series-list`. 56 lines in total: the 39 `learn-*` usages plus the hardcoded teal and purple `rgba(...)` glows.
  - `learn-teal` → `primary` and `learn-purple` → `accent-2`, keeping opacity modifiers.
  - `bg-learn-bg` → `bg-background` on the two full-page canvases and `bg-card` on panels (review decision Q2).
  - `rgba(0,229,196,x)` / `rgba(124,92,255,x)` → `color-mix(in oklch, var(--primary|--accent-2) x%, transparent)`. This applies in Tailwind arbitrary values, inline `style` gradients, and the series-card colour object.
  - Other raw colours on the same lines were also cleaned, because the colour guard checks whole added lines:
    - `text-white` → `text-foreground`
    - `border-white/*` → `border-border`
    - `bg-white/[0.03]` → `bg-muted/30`
    - `text-black` on the teal CTA → `text-primary-foreground`
    - `to-blue-400` → `to-accent-2`
    - the mask `#000` → `black`
- **New: `src/lib/stickers.ts`**: `STICKER_FILL` (a face letter → `var(--sticker-*)`), `STICKER_OUTLINE`, and `stickerFill()`.
- **`facelet-viewer.tsx`**
  - The hex map is gone. All 21 stickers and the outline use `style={{ fill, stroke }}`, because `var()` in SVG presentation attributes is unreliable.
  - The background rect uses `--sticker-outline`.
- **`admin/cube-painter.tsx`**
  - Uses the shared map, which **fixes its swapped R/L colours** (review decision Q7).
  - The grid gap uses `bg-sticker-outline`.
- **Legacy tokens removed**: `--learn-*` from `slate.ts` and `TOKEN_NAMES`, the `LegacyToken` exemption, and the `--color-learn-*` aliases. The generated CSS is regenerated.
- **New test: `tests/unit/stickers.test.tsx`** (5 tests)
  - the token map and the default scheme (R orange, L red)
  - FaceletViewer renders `var(--sticker-*)` fills and the outline, with no hex
  - missing facelets render as masked
- `docs/design-tokens.md`: checklist ticked.

**Kept on purpose**
- Raw colours on learn-page lines that don't use `learn-*` are unchanged (out of scope for step 3). The most visible are `text-white` on "Learn. Practice.", the card titles and the stat labels, which are nearly invisible on Paper.
- `--sticker-*` does not reach the cubing.js 3D and 2D players; they need a stickering config later.

**Verified**
- `npm run validate` passes (187 tests); `npm run check:colors` is OK.
- No `learn-(bg|teal|purple)` remains in `src/`.
- `npm run build && npx next start`:
  - `/learn` and `/learn/333` in Slate: panels are now on `--card` (the expected lift from `#070B17`); accents, badges and gradients are unchanged.
  - In Paper, everything migrated follows the theme.
  - FaceletViewer renders only for cases with a painted 54-character `cube_state`, and there are none in the data today, so it is covered by the render test instead.
- `npm run test:e2e:prod`: 10 of 10 pass.

---

## 2026-10-01 — Step 3, Phase 6: CI colour guard

**Request:** Phase 6 of the design-token plan: fail CI on new raw colours in changed files. Review decisions: scan `.ts` as well as `.tsx`, and flag `white`/`black` classes.

**Changed**
- **New: `scripts/check-colors.mjs`** (`npm run check:colors [base]`, default `origin/main`)
  - Scans only lines **added** since the merge base, including uncommitted edits locally.
  - Flags:
    - palette classes (`bg-slate-800`)
    - `white`/`black` classes (`text-white`, `bg-white/5`)
    - arbitrary colours (`bg-[#…]`, `-[rgb(…)`)
    - hex literals
    - literal colour functions (`rgba(0, …)`)
  - Comment lines and `rgb(${r} …)` template strings are ignored, so `token-color.ts` passes.
  - Exempt: `src/themes/**`, `tests/**`, and the ImageResponse files (`icon.tsx`, `opengraph-image.tsx`), which can't read CSS variables.
  - Escape hatch: a `color-guard-allow: <reason>` comment on the same line or the line above.
  - The output gives `file:line  match  (kind)` and a suggested fix.
- **New test: `tests/unit/color-guard.test.ts`** (23 tests): lines that should and shouldn't be flagged, exemptions, diff parsing with line numbers, and allow comments.
- **`package.json`**: new `check:colors` script.
- **`.github/workflows/ci.yml`**
  - The validate job checks out with `fetch-depth: 0` and runs the guard after lint.
  - The base is `origin/<base_ref>` for pull requests, `github.event.before` for pushes (only the pushed commits), and `origin/main` as a fallback. Event values are passed via `env`, not interpolated into the script.
- `docs/design-tokens.md`: checklist ticked.

**Kept on purpose**
- Added lines only, so touching an old file doesn't force a full migration (step 3 scope).
- `npm run validate` is unchanged, because the guard needs an `origin/main` ref.

**Verified**
- 182 unit tests pass; `tsc` and lint are clean.
- `npm run check:colors` on this branch: OK.
- Adding `bg-slate-800 text-[#fff]` and `"#EAB308"` to `cta-section.tsx` without committing fails with exit 1 and four findings at the right `file:line`. After reverting it exits 0.
- A SHA base (the push path) works.

---

## 2026-10-01 — Step 3, Phase 5: theme contrast test

**Request:** Phase 5 of the design-token plan: a unit test that computes WCAG ratios for every theme and fails on any miss.

**Changed**
- **New: `src/themes/color.ts`**, with no dependencies. It covers:
  - parsing hex and oklch; oklch uses Björn Ottosson's matrices
  - resolving `var()` chains (e.g. `timer-hold` → `destructive`)
  - alpha compositing
  - WCAG relative luminance and ratio
- **New: `src/themes/contrast-rules.ts`**: the spec's rules as data.
  - Body text: 4.5:1 on background, card and raised.
  - Status colours as text: 4.5:1 on all three surfaces.
  - `foreground-subtle`: 4.5:1 on background and card only (review decision).
  - Every `-foreground`/fill pair: 4.5:1.
  - Timer digits and states: 3:1 on background and card.
  - Chart series: 3:1 on background.
- **New test: `tests/unit/theme-contrast.test.ts`**
  - One test per theme and pair: 108 checks.
  - `--timer-scrim` keeps the digits at 3:1 over pure black and pure white background images.
  - The converter is pinned to known values (`oklch(0.208 0.04 265.8)` = `#0f172a`), so a maths slip can't make every check pass.
- **`src/themes/slate.ts`**: `--destructive` changed from `oklch(0.704 0.191 22.216)` to `oklch(0.73 0.191 22.216)`.
  - The test found 4.34:1 on `surface-raised`; the spec's `#F87171` hex had shown 4.54 and hidden it.
  - Following the "fix values, don't relax rules" decision, this is the smallest lightness step that passes (4.57).
  - It also slightly lightens `timer-hold`, which aliases it.
- `themes.generated.css` is regenerated.
- `docs/design-tokens.md`: the change is recorded and the checklist item ticked.

**Verified**
- `npm run validate` passes (159 tests).
- Setting Paper `muted-foreground` to `#999999` fails with `Paper: --muted-foreground on --background is 2.53:1, needs 4.5:1`, and so on. Reverted afterwards.
- `npm run build` passes, and the built CSS carries the new Slate destructive value.

---

## 2026-10-01 — Homepage scramble background follows the theme

**Request:** The homepage's floating move-chip background kept its dark and teal colours in Paper; fix it before continuing with step 3.

**Changed**
- **New: `src/lib/token-color.ts`**
  - `readTokenRgb(token)` resolves a theme token (oklch included) to sRGB by painting one canvas pixel, because canvas can't read CSS variables and needs alpha variants.
  - `withAlpha(rgb, a)` builds the colour string.
  - `observeTheme(cb)` is a MutationObserver on `<html>` for `data-theme` and `class`.
- **`src/components/react-bits/scramble-matrix.tsx`**: the ten hardcoded `rgba(...)` colours are replaced with theme tokens:
  - teal and mint → `--primary`
  - chip fill → `--background`, which is what the old `rgba(15,23,42)` was in Slate
  - highlighted letter → `--foreground`

  The palette is re-read when the theme changes. The reduced-motion single frame is redrawn.

**Kept on purpose**
- Animation, layout and alpha curves are unchanged. The mint highlight is now just `--primary` at full alpha.

**Verified**
- `npm run validate` passes.
- `npm run build && npx next start`, `/`: in Paper the chips are cream with rust outlines and letters; Slate looks as before. Switching theme live recolours the canvas without a reload.

---

## 2026-10-01 — Step 3, Phase 4: no-flash theme with the cookie as the source of truth

**Request:** Phase 4 of the design-token plan: apply the theme before first paint and keep `.dark` working for shadcn. Review decision Q8: the `cubehub-theme` cookie is the single source of truth, with no localStorage.

**Changed**
- **New: `src/themes/preference.ts`**
  - Defines `ThemePreference` (`slate | paper | system`) and `THEME_COOKIE`.
  - `parseThemePreference()` maps the legacy `dark` → `slate` and `light` → `paper`. Missing or unknown values → Slate.
  - Also `resolveThemeId()`, `themeMode()`, and `SYSTEM_THEMES`.
- **New: `src/themes/init-script.ts`**
  - `THEME_INIT_SCRIPT` is built from the theme registry, so ids and modes can't drift.
  - It does something only when the cookie is `system`: it reads `prefers-color-scheme` and sets `data-theme` and `.dark`.
- **`src/app/layout.tsx`**
  - Renders `data-theme` and `.dark` from the cookie.
  - Inlines the script in `<head>`, following Next's `preventing-flash-before-hydration` guide.
  - Adds `suppressHydrationWarning` on `<html>`.
  - The unused `light` class is no longer rendered.
- **`src/lib/theme.ts`**
  - The type is renamed from `Theme` to `ThemePreference`.
  - `setTheme()` resolves the theme, sets `data-theme` and `.dark`, and writes only the cookie.
- **`src/components/settings/settings-form.tsx`**: the Light / Dark / System options now store `paper` / `slate` / `system`. The labels are unchanged.
- **New test: `tests/unit/theme-preference.test.ts`** (7 tests)
  - Parsing, including the legacy values, and resolution.
  - Runs the real init script in jsdom with `matchMedia` mocked, for system + light, system + dark, and a no-op for an explicit theme or no cookie.

**Kept on purpose**
- No localStorage.
- `color-scheme` comes from the generated `[data-theme]` CSS, so the script doesn't set it.
- With `system`, changing the OS theme mid-session isn't picked up live; it applies on the next load, as before.

**Verified**
- `npm run validate` passes (51 tests).
- `npm run build && npx next start`:
  - The server renders the right attributes for every cookie value: none → slate, light → paper, paper → paper, dark → slate, system → slate (server-side guess).
  - The script is in `<head>` with its regex escaped correctly.
- In the browser:
  - `system` on a dark OS stays Slate. The OS-light path is covered by the jsdom test.
  - Choosing Light in Settings switches to Paper at once and writes `cubehub-theme=paper`. After a reload the server renders Paper.
  - No hydration or other console errors on reload under paper or system.

---

## 2026-10-01 — Step 3, Phase 3: font tokens

**Request:** Phase 3 of the design-token plan: wire `--font-ui`, `--font-mono` and `--font-timer` through `next/font`, loading JetBrains Mono only when Paper needs it.

**Changed**
- **`src/themes/`**
  - New tokens `font-ui`, `font-mono` and `font-timer`. `font-timer` is a core token, so every theme must set it.
  - In the base and Slate, all three point at the Geist variables.
  - Paper sets `--font-timer: var(--font-jetbrains-mono), var(--font-geist-mono), monospace`.
  - The generated CSS is regenerated.
- **`src/app/layout.tsx`**: adds `JetBrains_Mono({ variable: "--font-jetbrains-mono", preload: false, display: "swap" })` and puts its variable class on `<html>`.
- **`src/app/globals.css`**
  - `--font-sans` now points to `var(--font-ui)`.
  - `--font-mono` is removed from `@theme inline`. The theme token is now Tailwind's own variable: Tailwind's `.font-mono` reads `var(--font-mono)`, and the unlayered token overrides Tailwind's default in `@layer theme`.
  - New `@utility font-timer`, which sets the font family and `tabular-nums`.
- **`src/components/timer/time-display.tsx`**: `font-mono tabular-nums` becomes `font-timer`. This is a class swap only.

**Kept on purpose**
- Timer sizing is unchanged; adopting `--text-timer` belongs to step 6.

**Verified**
- `npm run validate` passes (44 tests).
- `npm run build && npx next start`, then `/timer`:
  - **Slate** loads only the two preloaded Geist woff2 files. JetBrains Mono has no preload link and is not fetched.
  - **Paper**: after switching, one more woff2 (the JetBrains latin subset) loads. The digits render in JetBrains Mono with `tabular-nums`.
  - The built CSS has no `--font-mono` cycle.
- `npm run check:chunks` passes.

---

## 2026-10-01 — Step 3, Phase 2: `src/themes/` is the source of truth

**Request:** Phase 2 of the design-token plan: typed theme objects, with the `[data-theme]` CSS generated from them.

**Changed**
- **New: `src/themes/`**
  - `types.ts`: `TOKEN_NAMES`, `ThemeDefinition`, `CoreToken`, and `BaseTheme`.
    - A theme that leaves out a core token fails `tsc`.
    - The type is named `ThemeDefinition` because `Theme` is already the preference type in `src/lib/theme.ts`.
  - `base.ts` holds the `:root` light base (internal only). `slate.ts` holds what used to be the `.dark` values. `paper.ts` is the Paper theme.
  - `index.ts` exports `THEMES`, `ThemeId`, and `resolveTokens()`.
  - `css.ts` exports `themesToCss()`. It emits `:root` first and then one `[data-theme]` block per theme, sets `color-scheme` from `mode`, and rejects unsafe values and ids.
  - `themes.generated.css` is the checked-in output.
- **New test: `tests/unit/themes-css.test.ts`**
  - A file snapshot (`toMatchFileSnapshot`), so a stale generated file fails CI. Regenerate it with `npx vitest run -u`.
  - Also checks ordering and `color-scheme`, and that injection is rejected.
- **`src/app/globals.css`**: the `:root`, `.dark`, and Paper blocks (200 lines) are replaced by `@import "../themes/themes.generated.css"`. The `@theme` aliases stay.
- **`src/app/layout.tsx`**: renders `data-theme="slate"` when the cookie resolves to dark, because Slate's values are now keyed on `[data-theme="slate"]`, not `.dark`.
- **`src/lib/theme.ts`**: `setTheme()` sets or removes `data-theme` along with `.dark`, so switching on the client still restyles the page without a reload.

**Kept on purpose**
- The generated CSS is checked in and there is no build step: nothing more runs in `predev`/`prebuild`, and CI's Node 20 can't import `.ts` without adding `tsx`.
- `learn-*` values are still defined, as a `LegacyToken` that the base is exempt from, until Phase 7.
- Slate now lists `timer-holding`, `timer-running`, `timer-digits`, and `radius` explicitly (core tokens). The values are unchanged.
- Light still means the `:root` base; the switch to `light → paper` is Phase 4.

**Verified**
- `npm run validate` passes (44 tests).
- Removing `timer-running` from `paper.ts` makes `tsc` fail with "Property 'timer-running' is missing".
- `npm run build && npx next start`: the server renders `data-theme="slate"`. Under both Slate and Paper, the computed values of all 184 custom properties match the Phase 1 baseline exactly: 368 checked, 0 differences. `/timer` and `/learn` look unchanged.

---

## 2026-10-01 — Step 3, Phase 1: design tokens added to globals.css

**Request:** Step 3 of the CubeHub → CubeUniverse plan (the design token spec), Phase 1: add the new tokens for the `:root` base, Slate (`.dark`), and Paper, with `@theme inline` aliases.

**Changed**
- `src/app/globals.css`
  - Added the 19 new role tokens (`surface-raised`, `surface-overlay`, `foreground-subtle`, `accent-2`, `success`, `warning` and their `-foreground` pairs, `timer-digits`, `timer-scrim`, and `sticker-*`) to `:root` and `.dark`. Values are oklch converted from the spec's hex; sticker colours stay as their exact current hex.
  - Added a complete `[data-theme="paper"]` block, covering every shadcn token so nothing falls through to the grey base.
  - Added a `--color-*` alias for every new colour in `@theme inline`.
  - Added a plain `@theme` block for `--text-scramble`, `--text-timer`, and `--ease-standard`. Aliasing them in `@theme inline` would be circular.
  - Added `--space-panel`, `--layout-gap`, `--duration-*`, and `color-scheme` to each theme.
- `docs/design-tokens.md`: the spec, renamed from `CubeUniverse Design Token Spec (Step 3).md` and updated with the review decisions:
  - four colour fixes: Slate accent-2 `#A48EFF`, and Paper primary `#A94016`, warning `#8C520A`, and success `#216F45`
  - `foreground-subtle` is not allowed on `surface-raised`
  - cookie as the source of truth
  - Tailwind's text and shadow scales deferred
  - the guard also scans `.ts` files

**Kept on purpose**
- `--learn-*` stays until Phase 7.
- `.dark` still carries the Slate values; they move to `src/themes/` in Phase 2.
- The spec's `--text-lg/xl/2xl` and `--shadow-*` are not defined, because they would override Tailwind's scales across the site.

**Verified**
- `npm run validate` passes (39 tests; the one lint warning was already there).
- `npm run build && npx next start`: `/timer` in Slate looks unchanged.
- Setting `data-theme="paper"` in the browser (with `.dark` removed) gives the cream canvas with dark digits and `color-scheme: light`; `--radius` becomes 0.75rem.
- The computed values of all 184 custom properties under both themes were saved as the baseline for Phase 2's before/after diff.

---

## 2026-09-30 — Session wrap-up: next-steps review (no code changes)

**Request:** Review `project_plan/context.md` and this log, and set out the next steps.

No source files changed. Only this entry was added. The agreed order of work:

1. **Commit the pending work.** That covers the Drill Lab, the Drill tab, the §3.5 backup-restore
   fix, docs and tests. First decide on `.mcp.json`: it grants the Supabase MCP **write**
   access, which contradicts `docs/database.md`. The recommendation is to add
   `&read_only=true`.
2. **Bring live Supabase up to date (blocking).** Run each step in its own SQL editor run: fix
   the `'OLL'` case → seed → access tiers → drill lab → `notify pgrst, 'reload schema'` → the
   drill test alone (expect 22 PASS) → `supabase migration repair` if using the CLI. The full
   steps are in `project_plan/context.md`.
3. **Checks that need live data or a deploy:**
   - the signed-in drill flow (save, +2/DNF/delete, reload, weakest-first)
   - the recommendation with saved data
   - Vercel: build command, `check:chunks` on the deployed URL
   - Supabase Site URL, redirect allow-list and `NEXT_PUBLIC_SITE_URL`
   - the admin case editor in a browser
4. **Finish Phase 3:**
   - wire up `filter-bar.tsx`, which is still a stub
   - decide whether to enforce access tiers in RLS (today they are badges only)
   - add seeded drill data to CI so the 3 skipped e2e tests run
   - optionally move the card and tutorial viewers to the derive-from-algorithm primitive
5. **Then Phase 4 (Shop).** It needs `products` and `sponsors` migrations before the
   recommender is built.

**Housekeeping noted:**
- `server-only` and `postcss` are used but not declared in `package.json`.
- The domain (`cubehub.in` or `.io`) and the timing of Cubelelo outreach are still open.

---

## 2026-09-30 — Drill tab in the navbar; live database check

**Request:** Add a Drill tab to the navbar, and check whether the live database is correct.

### Changed

| File | Change |
|---|---|
| `src/lib/navigation.ts` | New **Drill** tab (`/learn/333/drill`, `Target` icon) after Learn. `NavItem` gains an optional `match` regex, and `activeNavHref()` picks exactly one active tab, most specific first. Without this, the drill page lights up both Learn and Drill, since it lives under `/learn/`. The phone bar stays at 5 tabs: Compete (still a placeholder page) drops out there alongside Stats, and stays on desktop. |
| `navbar.tsx`, `bottom-nav.tsx` | Use `activeNavHref()` instead of their own prefix checks. |
| `learn/[puzzle]/drill/page.tsx` | The empty state now says so when a puzzle has no algorithm sets at all, and links to tutorials, instead of "this set has no cases". |
| `tests/unit/navigation.test.ts` (new) | Active-tab rules, and the 5-tab phone bar including Drill. |

**Verified:** tsc, eslint and 39/39 unit tests pass. In the dev server, `/learn/333/drill`
highlights only Drill on both desktop and phone, and `/learn` highlights only Learn.

### Live database check (anon REST; the Supabase MCP was still not connected in this session)

Unchanged from before. `algorithm_subsets`, `can_access`, `drill_attempts`, `drill_state` and
`v_drill_variant_stats` don't exist through the API, and there is still 1 algorithm case
(`subset = 'OLL'`, case 1). The migrations are not applied yet, or PostgREST's schema cache
was not reloaded. Follow the ordered steps from the previous answer (fix the `'OLL'` case,
then seed, then access tiers, then drill lab, then `notify pgrst, 'reload schema'`, then run
the test on its own).

---

## 2026-09-30 — Supabase MCP server added (project scope)

**Request:** Add the hosted Supabase MCP server to the project.

| File | Change |
|---|---|
| `.mcp.json` (new) | `supabase` HTTP server for project `bmgupzbyzuxrdsqtiwli`, with features docs, account, database, debugging, development, functions and branching. |

**Note:** the URL has no `read_only=true`, so the server can **write** to the live database.
`docs/database.md` says the MCP is read-only and that migrations are applied deliberately
through the dashboard or CLI, not by an agent. This change conflicts with that until one of
the two is updated.

---

## 2026-09-30 — Priority 1: Drill Lab, plus 3.5 backup restore

**Request:** Build the Drill Lab (brief §3.1–3.4) and close the JSON-backup restore gap (§3.5).
The plan (`~/.claude/plans/warm-squishing-parnas.md`) was approved with these choices: a new
route with the timer's train mode retired; guests can drill but nothing is recorded for them;
the recognition split ships as an option that is off by default.

### Schema: `supabase/migrations/20260930000000_drill_lab.sql` (written, **not applied to live**)

| Object | Purpose |
|---|---|
| `drill_attempts` | One row per rep, keyed `(user_id, algorithm_id)` (per variant, not per case). Generated `effective_time_ms` and `succeeded`. `recognition_ms` is nullable. `source` is `drill` or `detected_in_solve`. Owner-scoped RLS. |
| `drill_state` | Spaced-repetition state (counts, ease, interval, `next_review_at`). Written only by trigger; clients can read their own rows but not write. |
| `recompute_drill_state()` + 3 statement-level triggers | Authoritative replay per `(user, algorithm)`, so +2/DNF edits and deletes heal the state. Execute is revoked from client roles. |
| `v_drill_variant_stats` | `security_invoker` view: per-variant attempts, successes, DNF-free medians (execution and recognition), and the review state. |

### Added

| File | Purpose |
|---|---|
| `src/lib/drill/case-state.ts` | The §3.1 primitive. twisty-player gets the real alg with `experimentalSetupAnchor: "end"`, so it shows the inverse (the case) and plays the alg forward. Also handles random pre-AUF and the physical-cube setup (`Alg.invert()`). |
| `src/lib/drill/recommend.ts` | Switch rule: both variants need ≥10 successes, and the alternative must be ≤95% of the current median **and** ≥100 ms faster. Also a "try the alternative" nudge, and the §3.3 sentence. |
| `src/lib/drill/order.ts` | Weakest first (due reviews, then never drilled, then failure rate ×4 plus relative slowness), a weighted pick from the weakest 3 with no immediate repeats, the current-variant rule, and guest stats from attempts. |
| `src/lib/drill/{types,rows,dal,actions}.ts` | Types, row mapping, the server-only DAL (`getDrillData`), and server actions (record, set penalty, delete). |
| `src/stores/drill-store.ts` | Drill timer, separate from `timer-store`. Starts on the first tap with no hold. Optional recognition phases. |
| `src/components/drill/*` | `DrillLab`, `DrillCaseView`, and the variant picker, session list and weakest-first ranking (which doubles as the custom-set picker). |
| `src/app/(app)/learn/[puzzle]/drill/page.tsx` | Route with `?set=` (slug or `all`), `?cases=`/`?case=` for custom sets, and `?order=`. |
| `supabase/tests/drill_lab_test.sql` | Lifecycle and RLS test (`begin … rollback`, 22 PASS rows). |
| `tests/unit/drill-case-state.test.ts`, `drill-logic.test.ts`, `backup-roundtrip.test.ts` | Unit tests. |
| `tests/e2e/drill.spec.ts` | Guest drill, recognition split, **the switch recommendation built from timed reps**, and redirects. |

### Changed

| File | Change |
|---|---|
| `timer-screen.tsx`, `timer/page.tsx` | Train mode removed (setup injection, drill report overlay, props). `?train=` now redirects to the drill: a UUID becomes `?case=`, a slug becomes `?set=`. |
| `learn/[puzzle]/[series]/page.tsx`, `algorithm-card.tsx` | "Train Set/Case" links now go to the Drill Lab ("Drill Set/Case"). |
| `src/lib/learn/dal.ts`, `actions.ts` | Removed the now-unused `getRandomCaseForDrill` and `getRandomCaseForDrillAction`. |
| `src/lib/timer/stats.ts` | Added `medianMs()` (matches `percentile_cont`). |
| `src/lib/timer/import-cstimer.ts` | **§3.5 fix:** restoring a CubeHub backup dropped sessions that had no solves. They are now kept. The rest of the restore path already existed and the new round-trip test confirms it. |
| `scripts/check-chunks.mjs` | Now also crawls `/learn/333/drill?set=pll`. |
| `docs/database.md`, `docs/roadmap.md` | Drill Lab section; spaced-repetition gap closed; live-data gap recorded. |

### Verification

- **Migration on a real Postgres:** a throwaway `supabase/postgres:15.8.1.060` container
  (podman), with all 9 migrations applied in order as `supabase_admin`, then
  `drill_lab_test.sql`: **22/22 PASS**. Negative check: with the attempts policy loosened to
  `true`, exactly the 3 cross-user RLS rows FAIL. Restoring the policy brings back 22/22.
- **Unit:** 37/37 pass. Every seeded PLL, OLL and Ortega algorithm, with every AUF, returns
  to solved from its derived setup, which proves the primitive for every case in the seed.
- **Build:** `npm run validate` passes (0 errors). The Turbopack build passes. The chunk
  guard resolves 67 files across 4 pages.
- **Browser, against seeded data:** the app was built against the local DB through PostgREST
  and a small proxy (recipe below). All 10 e2e tests pass there, including the recommendation
  banner generated from real timed reps. Screenshots were checked at desktop width and at
  390 px (no horizontal overflow).
- **Browser, against the real environment:** 7 pass. The 3 drill tests that need data skip
  with a reason, because live has no OLL/PLL data (see below). CI will behave the same way.
- **Bug found by e2e and fixed:** after ticking a drill option, Space toggled the focused
  checkbox instead of driving the drill.
- **Not verified:** the signed-in path (recording through server actions against a real
  session). It needs the migration applied to Supabase first.

### Needs the founder

1. **Live data is behind the code, and this predates today's change.** Live has no
   `algorithm_subsets` table because `20260914000000_access_tiers.sql` was never applied. So
   `getPuzzles()` lists no OLL/PLL series at all. Live also has 1 algorithm case, not the
   seeded 78. Apply the pending migrations and the seed data, then this one.
2. **Apply `20260930000000_drill_lab.sql`** through the dashboard or CLI
   (`supabase migration repair --status applied 20260930000000`), then run
   `supabase/tests/drill_lab_test.sql` in the SQL editor and expect every row to be PASS.
3. **Access tiers aren't enforced by RLS on `algorithms`** (the policy is still
   `is_approved`). The drill matches the series pages, which show tier badges only.

### Local verification stack (recipe)

```sh
podman run -d --name cubehub-pgtest -e POSTGRES_PASSWORD=postgres -p 55432:5432 docker.io/supabase/postgres:15.8.1.060
for f in supabase/migrations/*.sql; do podman exec -i -e PGPASSWORD=postgres cubehub-pgtest \
  psql -h localhost -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q < "$f"; done
# RLS tests need two users (the signup trigger creates their profiles):
#   insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values (…), (…);
podman exec -i -e PGPASSWORD=postgres cubehub-pgtest psql -h localhost -U supabase_admin -d postgres < supabase/tests/drill_lab_test.sql
```

For browser tests, run `postgrest/postgrest` (anon role, a local JWT secret) on 55433, with
a small proxy that maps `/rest/v1/*` to it. Build with `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` pointing at the proxy, then run `E2E_PROD=1 npx playwright test`.
**Rebuild with the real environment afterwards.** `NEXT_PUBLIC_*` values are baked in at build time.

---

## 2026-09-30 — Priority 0: take cubing.js out of the bundle (one bundler for dev and prod)

**Request:** Serve cubing.js from `public/` as a self-contained build and load it at runtime.
Delete both `next.config.ts` workarounds so `next dev` and `next build` use the same bundler.
Add a chunk-404 guard to CI. Done means the landing hero and the scramble preview render in a
local production build.

**Decision (confirmed with the founder):** build the self-contained artifact locally with
esbuild from the installed cubing 0.56.0, instead of mirroring `cdn.cubing.net`. The CDN only
serves the latest release (0.63.8) with no version pinning, which would not match the 0.56.0
types. The output has the same shape as the CDN build: ESM split into chunks, relative
imports only, with `three` bundled in.

### Added

| File | Purpose |
|---|---|
| `scripts/build-cubing.mjs` | esbuild over `cubing/dist/lib` → `public/cubing/<version>/`. Runs on `predev` and `prebuild`. Keeps `chunks/search-worker-entry.js` at a fixed path so cubing finds its worker. Output is deterministic and older versions are pruned. |
| `src/lib/cubing/runtime.ts` | The only entry to cubing: `loadTwisty`, `loadScramble`, `loadAlg`, `loadPuzzles`. Memoised `import(/* webpackIgnore */ url)`; a failed load can be retried. Types come from `node_modules`. |
| `scripts/check-chunks.mjs` | Chunk guard (`npm run check:chunks -- <url>`). Crawls pages, then Turbopack chunk paths, webpack `id→hash` maps (including runtimes embedded in a chunk), and the whole cubing module graph. Fails on any missing file or wrong MIME type. |
| `tests/e2e/cubing-runtime.spec.ts` | Real-browser test: landing 3D cube draws, `/timer` gets a worker-generated scramble and a mounted preview, and nothing 404s or throws. |

### Changed

| File | Change |
|---|---|
| `next.config.ts` | Removed the `webpack` chunkFilename override and the empty `turbopack: {}`. Only `env.NEXT_PUBLIC_CUBING_VERSION` remains. |
| `package.json` | `build` changed from `next build --webpack` to `next build`. Added `predev`/`prebuild` (`build-cubing`), `check:chunks`, `test:e2e:prod`, and the `esbuild` devDependency. |
| `scramble-preview-inner.tsx`, `case-viewer-inner.tsx`, `alg-player-inner.tsx` | `import("cubing/twisty")` → `loadTwisty()`. |
| `src/lib/timer/scrambler.ts` | `import("cubing/scramble")` → `loadScramble()`. The local memo was dropped because the loader memoises. |
| `src/lib/admin/cube-state-utils.ts` | Static `cubing/alg` and `cubing/puzzles` imports → `loadAlg()` and `loadPuzzles()` inside the (already async) functions. |
| `eslint.config.mjs` | Errors on value imports from `cubing/*`, both static and `import()` (type imports are allowed). Ignores `public/cubing/**`. |
| `playwright.config.ts` | In CI, or with `E2E_PROD=1`, tests run against `next start` on port 3100 instead of `next dev`. |
| `.github/workflows/ci.yml` | New "Chunk Guard" step after the build, before Playwright. |
| `.gitignore` | Added `/public/cubing`. |
| `docs/roadmap.md`, `docs/phase1_todo.md` | Marked resolved; documented the fix. The history is kept. |

### Verification

- `npm run validate`: passes (17/17 unit tests, 0 lint errors).
- `npm run build` on Turbopack: finishes in about 23s total. It used to hang forever. No cubing internals remain in `.next/static`.
- `check:chunks` on the production build: 67 files, including all 34 cubing modules, resolve.
  Checked against three deliberately broken builds, and it caught all of them: a missing
  cubing worker, a missing Turbopack chunk, and a webpack build with a chunk renamed so it
  no longer matches its runtime.
- Playwright on `next start`: all 6 e2e tests pass. The cubing test fails when the worker file is hidden, as it should.
- Browser checks on both `next start` and `next dev`: landing hero, 3D showcase cube, timer
  scramble and preview, and the tutorial cube players (6 on `/learn/333/beginner`) all render.
  No page errors and no failed requests.
- **Not browser-tested:** the admin case editor (`cube-state-utils`), which needs an admin login.

### Follow-ups

- Confirm Vercel builds with `npm run build` and that no project setting pins `--webpack`.
- The branches `route3-unbundle-cubing` and `try-cubing-upgrade` remain as the record.

---

## 2026-09-30 — Dead code cleanup

**Request:** Find dead code and remove it safely, without changing behaviour.

**Method:** Ran `knip` (unused files / exports / dependencies) plus
`tsc --noUnusedLocals --noUnusedParameters`, then checked every candidate by hand with grep
across `src/`, `tests/`, `docs/`, `project_plan/` and `public/` before removing it.

### Removed

| What | Where | Why it was dead |
|---|---|---|
| `Cubes` component | `src/components/react-bits/cubes.tsx` (deleted) | Never imported anywhere. |
| Cubes 3D-grid CSS + its `:root` vars | `src/components/react-bits/react-bits.css` | Only used by the deleted `Cubes` component. The Scroll Float / Scroll Reveal styles are kept. |
| `HeroCube` video hero | `src/components/marketing/hero-cube.tsx` (deleted) | Replaced by `ScrambleMatrix` in `164fc10`; nothing imports it any more. It is still in git history. |
| Hero asset README | `public/hero/README.md` (deleted) | Only described the assets for `hero-cube.tsx`. |
| `resolveTheme()` | `src/lib/theme.ts` | Never called. |
| `isEditingLayout()` | `src/stores/layout-store.ts` | Never called. |
| `_FACE_CHARS` constant | `src/components/admin/cube-painter.tsx` | Declared but never read. |
| Unused `React` default imports | `facelet-viewer.tsx`, `cube-showcase.tsx`, `scramble-matrix.tsx`, `tests/unit/username-onboarding.test.tsx` | Not needed with the `react-jsx` transform, and never referenced. |
| Duplicate `export default` | `scroll-float.tsx`, `scroll-reveal.tsx` | Every consumer uses the named export. |
| `@testing-library/user-event` devDependency | `package.json`, `package-lock.json` | No test imports it. |
| `vite-tsconfig-paths` devDependency | `package.json`, `package-lock.json` | `vitest.config.ts` uses Vitest's built-in `resolve.tsconfigPaths` instead. |

### Kept on purpose (flagged as unused, but not dead)

- `src/components/learn/filter-bar.tsx`: not imported yet, but
  `project_plan/2026-09-14-phase3-learn-tab-completion.md` plans to rework it.
- `getAlgorithmSubsets` / `AlgorithmSubset` in `src/lib/learn/dal.ts`: added in the latest
  access-tier commit and listed as a planned export in the Phase 3 plan.
- `src/scripts/**`: a standalone CLI (`npx tsx src/scripts/generate-seed-migration.ts`),
  which is not part of the app import graph.
- Unused sub-exports of shadcn primitives (`CardFooter`, `PopoverTitle`, `Progress*`,
  `buttonVariants`, …): these are library building blocks, left as the shadcn CLI generated them.
- Exports that are used inside their own file (`CubeMark`, `mirrorAlg`, `EXPORT_VERSION`,
  `STOP_DEBOUNCE_MS`, …): the code is live, so only the `export` keyword is extra.
- `_alg` parameter in `algorithm-case-editor.tsx`: a placeholder in a handler that is still
  being built.

### Noticed, not changed

- **Unlisted dependencies:** `server-only` (imported by the four `dal.ts` files) and `postcss`
  are used but not declared in `package.json`. They resolve today only as transitive deps.

### Verification

- `npm run validate` (tsc, eslint, vitest): passes. 17/17 tests, 0 lint errors.
- `npm run build`: passes, all routes compile.
- Pre-existing uncommitted edits to `src/app/(app)/learn/[puzzle]/page.tsx` were left untouched.
