# Companion plan: Cubby v1

> **Status:** in progress on `feat/cubby` (from 2026-11-26) · Sumit Garad
> **For:** Claude Code. Read `AGENTS.md`, `docs/architecture.md` (timer rules) and the spec,
> `docs/cubby-cubing-companion.md` (repo copy of the Claude Doc), first.
> **Related:** `docs/app-shell-plan.md` (the sidebar slot), `docs/home-plan.md` (Cubby's tip card),
> `docs/landing-plan.md` (Meet Cubby, step 10), `docs/timer.md` (modes; BLD is branch 2).

## Summary

Cubby v1 is fully scripted: a character, a Director that decides when it may speak, a dock, a tour
engine and per-page content files. No AI, no backend cost. Everything ships behind
`NEXT_PUBLIC_SHOW_CUBBY=1`; with the flag unset, no Cubby code is loaded and the app is unchanged.

The final art isn't ready, so v1 draws a **v0 character in SVG**: every part (body, eyes, brows,
mouth, arms, legs) is a separate file behind a manifest, so the real art replaces files, not code.
Pages never touch the SVG: they talk to a `CubbyRenderer` (`setInput`, `fire`, `onEvent`, `destroy`),
so a Rive renderer can be added later with one config line.

**Done when:** with the flag on, the Timer, Learn, Drill Lab and Playground pages each have a tour that
starts on the first visit, can be skipped at every step and resumed from the dock, and never shows
while a solve or inspection is running. Greetings follow the caps, PB/DNF/+2/mastered/error
reactions play after the timer stops, the settings work for guests and members, and with the flag
off nothing changes (e2e proves both).

## Architecture

```
app code ──emit──▶ companion bus ──▶ CompanionProvider ──▶ Director ──▶ dock / bubble / tour overlay
 (timer, drill,      (lib/companion/   (lazy, client,        (quiet rules,     │
  playground,         bus.ts; imports   mounted in the        caps, settings)   ▼
  toasts)             nothing)          (app) layout)                       CubbyRenderer ──▶ SvgCubbyRenderer
                                                                            (setInput/fire)    (art/ + manifest)
```

- **The bus** (`src/lib/companion/bus.ts`) is a tiny typed emitter. Timer, drill and playground code
  only `emit()`; they never import companion UI. With the flag off nothing listens, so an emit
  costs one empty loop.
- **The Director** (`src/lib/companion/director.ts`) is pure logic: given a candidate (a greeting, a
  reaction, a tour) and the context (timer phase, inspection, settings, what was shown this session),
  it returns show or drop. The provider is its only caller.
- **Content** lives in `src/content/cubby/<page>.json`, validated at load. Lines use `{name}`.
- **Loading:** the provider is a `next/dynamic` client island mounted after hydration
  (`ssr: false`), so the timer's first paint never waits for Cubby (spec → Build notes).

## Build order

Each step is one commit on `feat/cubby` with `npm run validate` and `npm run check:colors` green.
`npm run test:e2e:prod` runs at the end of the branch, with the flag on and off.

### 1. Renderer interface and the SVG renderer

- `src/lib/companion/renderer.ts`: the input names from the spec (`mood`, `isTalking`, `pointAt`,
  `isThinking`, `bldPhase`, `theme`), the triggers (`wave`, `celebrate`, `wince`, `thumbsUp`), and
  `CubbyRenderer { setInput, fire, onEvent, destroy, View }`. `View` is the React component that
  draws this renderer, so callers render `<CubbyAvatar renderer={r} />` and never know which
  renderer it is.
- `src/lib/companion/svg-state.ts`: the state machine as a pure reducer: inputs and triggers in,
  the pose to draw out (expression, arm pose, body motion), with timed one-shots falling back to idle.
- `src/components/cubby/svg-renderer.tsx`: `SvgCubbyRenderer` (a small external store + the reducer)
  and its `View`. `src/components/cubby/create-renderer.ts` picks the renderer: the one config line.
- **Tests:** reducer (inputs, one-shots return to idle, unknown input ignored, `isTalking` mouth
  flaps, `bldPhase`), renderer (`onEvent` gets `triggerEnd`, `destroy` stops listeners).
- **Done when:** a renderer can be created, driven and destroyed without React knowing which one.

### 2. Cubby v0 art and the review page

- `src/components/cubby/art/`: `body.tsx` (rounded 3x3, front face of stickers), `eyes.tsx`,
  `brows.tsx`, `mouth.tsx`, `arms.tsx`, `legs.tsx`, each exporting its variants, and `manifest.ts`
  mapping every expression (`idle`, `happy`, `grin`, `surprised`, `concerned`, `focused`, `sleepy`,
  `talking`) to part variants. Sticker colours are the theme's `--sticker-*` tokens; outline uses
  `--foreground`. No hex values (check:colors).
- Motion: `motion/react`, 150–400 ms eased reactions, a slow breathing idle, blinks; with reduced
  motion, pose changes are instant and nothing loops.
- `src/app/dev/cubby/page.tsx`: every expression, trigger and input, at both sizes (56 px dock, 140 px
  stage), in the current theme. 404 unless the flag is on; `noindex`.
- **Tests:** manifest covers every expression with existing part variants; the art renders for every
  expression (no throw), `aria-hidden` on the SVG.
- **Done when:** `/dev/cubby` shows all states and triggers, and the art recolours with the theme.

### 3. Director and content model

- `src/lib/companion/director.ts`: `isQuietPhase(phase, inInspection)`; `decide(candidate, ctx)` with
  the hard rules: nothing while the timer isn't idle/stopped or during inspection; at most one
  unprompted bubble per page per session; greetings at most once per page per session and not if
  the page was opened in the last 10 minutes; settings respected (`off`: nothing; `quiet`: only what
  the user asked for; reactions `all`/`pb`/`off`). Session memory in `sessionStorage`, page visits
  in `localStorage` (`cubehub.companion.visits.v1`).
- `src/lib/companion/content.ts`: types and a validator for `src/content/cubby/*.json` (tour version,
  steps with `id`, `target`, `title`, `body`, `mood`, `waitFor`, `since`; greetings with `when`;
  reactions), `fillName()`, `pickGreeting(pool, ctx)` (first visit, 7+ days away, time of day).
- `src/lib/companion/pages.ts`: pathname → page id (`timer`, `learn`, `learn-series`, `drill`,
  `playground`).
- **Tests:** every quiet rule and cap; every content file passes the validator; `{name}` filling;
  greeting conditions; page matching.

### 4. The dock

- Desktop: the sidebar's reserved slot renders `CubbyDock` (56 px avatar; in Rail, the avatar alone).
  Phones: a floating button above the bottom nav. Both hidden while Focus mode hides chrome.
- Menu (Base UI Menu): Tour this page, What's new (when there's one), Tips, Mute/Unmute, Settings.
  A small dot (never a count) when there's an unseen tour or What's new.
- Keyboard: `?` opens the menu (ignored in inputs and while the timer isn't idle), `Esc` closes any
  bubble or tour. The timer's `?` shortcut sheet keeps `?` on `/timer`; there the menu opens with
  `Shift+/` only from the dock button (see decisions).
- **Tests:** unit for the dot rule; e2e opens the menu.

### 5. Tour engine

- `src/lib/companion/tours.ts`: progress `{ page: lastSeenVersion }` (guests: `localStorage`;
  members: `user_settings.companion`, step 8), full vs What's new steps (`since > lastSeen`),
  skipped tours offered once more from the dock dot.
- `src/components/cubby/tour-overlay.tsx`: a portal; four blocker rects around a rounded spotlight
  (clicks reach the target only on interactive steps); recomputed on resize/scroll; steps whose
  target is missing are skipped; a step without a target shows a centred card. Card: title, body,
  step dots, Back / Next / Skip tour (Skip never smaller than Next). Keyboard: arrows, Enter, Esc;
  focus moves to the card and returns afterwards. `useOverlayLock` while open, released on
  interactive steps so the real action (Space on the timer) works. Hidden while the timer runs;
  paused while the user types in a field outside the card.
- **Tests:** unit for step selection, skipping missing targets, progress; e2e for a full tour with
  keyboard and an interactive step.

### 6. The four beta tours

- `src/content/cubby/{timer,learn,learn-series,drill,playground}.json`, copy from the spec's table,
  checked against the real UI. `data-tour` markers added to the elements they point at.
- Interactive steps through the bus: `puzzle:changed`, `timer:started`/`timer:stopped`,
  `drill:started`, `playground:turned`, `playground:rotated`.
- **Tests:** every step's `target` exists as a `data-tour` marker in `src/` (a unit test greps for
  them); e2e runs the Timer tour to the end.

### 7. Greetings and reactions

- Greetings on page entry, 1 s after load, auto-dismissed after ~4 s, typed at ~30 ms per character
  (instant with reduced motion; skippable by click), real DOM text in an `aria-live="polite"` card.
- Reactions from the bus: `pb` (celebrate + line), `penalty` (wince, no line), `drill:mastered`
  (thumbs up), `error` (concerned look beside the toast), 60+ minutes of continuous solving (one
  "stretch your hands?" per day). Emits added to `timer-screen.tsx`, the drill lab, the playground
  and the toast store.
- **Tests:** unit for the reaction rules and the 60-minute rule; e2e: a greeting appears once per
  session and never while the timer runs.

### 8. Settings

- `CompanionSettings`: mode on/quiet/off, name (default Cubby, 1–20 characters), auto tours,
  reactions all/pb/off, inspection coach (stored, off by default; the coach itself is v1.5),
  BLD animation, motion system/full/reduced; Reset tours.
- Guests: `localStorage` `cubehub.companion.v1`. Members: `user_settings.companion jsonb`
  (`{ settings, tours }`) by migration file only; on sign-in a guest's settings and tour progress are
  copied up once if the account has none. Missing column → defaults, logged once.
- UI: a Cubby section in Settings (members) and a settings dialog from the dock (everyone).
- **Tests:** parse/merge, name validation, migration SQL test file.

### 9. Home tip card and the landing page

- Home's Cubby's tip card shows the v0 Cubby (static pose) instead of the icon, behind the flag.
- Landing step 10: Meet Cubby with three poses (waving, celebrating, focused with a blindfold) and
  the spec's captions; eyes follow the pointer while on screen (not with reduced motion). Behind
  the flag.
- **Done when:** both render with the flag and are unchanged without it.

## Branch 2: `feat/bld-mode` (from `feat/cubby`)

### 10. BLD timer mode and Cubby's blindfold solve

- Timer mode **BLD**: no inspection; optional memo split (a second keypress while running marks
  the end of memo), set in preferences. `memo_ms` stored with the solve (migration file:
  `solves.memo_ms integer null`, check `0 < memo_ms <= time_ms`), kept locally for guests, shown
  in solve details as "Memo 23.41 · Exec 41.12".
- Cubby's `bldPhase`: memo → execute (on the split, or after a short memo pose without it) →
  finish (success: celebrate; DNF: shrug and "BLD is brutal. Next one."). The one exception to the
  quiet rules, off with the BLD-animation setting.
- **Tests:** unit for the split logic and memo storage; e2e for a BLD solve with a split.

## Accessibility (requirements)

- Speech cards are real text with `aria-live="polite"`; the character is `aria-hidden`.
- Tours are keyboard-driven (arrows, Enter, Esc) with visible focus on the spotlighted element.
- `prefers-reduced-motion` (or the Motion setting): static pose changes, no confetti, no typing.
- Speech card text uses `card-foreground` on `card`, AA in every theme (the existing contrast test).
- Every tour is skippable at every step; Skip is never smaller than Next.

## Open questions

1. The landing page's Meet Cubby with v0 art: show it before the final art? (Built behind the flag.)
2. Tour metrics (completion, drop-off, mute rate) need events: add them to the Vercel Analytics
   events once the Home events ship? (Not in this branch.)
