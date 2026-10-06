# Playground — plan

Status: **Phase 1 built (2026-10-06)** — `/playground`, 3x3 and 2x2. Phases 2–3 are
still proposals. Decided: playground solves are **never stored**, anywhere (no
Supabase, no localStorage), and the smart-cube work waits until there is a
Bluetooth cube to test with.

### What Phase 1 shipped, and how it differs from the plan below

- Code: `src/lib/playground/` (keymap, history reducer, KPuzzle solved/valid-move
  checks), `src/components/playground/`, route `src/app/(app)/playground/page.tsx`.
  `?puzzle=222` opens the 2x2.
- State is a `useReducer` in the screen, not a zustand store: nothing outside the
  page reads it, and nothing is persisted.
- 3D uses cubing's **`PG3D`** renderer, not its default 3x3 one, because
  click-to-turn (`experimentalMovePressInput: "basic"`) is silently skipped on the
  default renderer. Clicks are routed through our own move list by intercepting
  `player.experimentalModel.experimentalAddMove` (see `playground-cube.tsx`). That
  is an experimental cubing API: re-test clicking after any cubing upgrade.
- Every move, from keys, pad or clicks, is checked against the puzzle's KPuzzle
  first, so a shift-click slice on a 2x2 is ignored instead of breaking the cube.
- Move count ignores whole-cube rotations. A double turn typed as two key presses
  counts as two moves, as in csTimer.
- Navbar has a Playground link; the phone bottom bar does not (still five tabs).
  On mobile it is reached from a button in the Learn hero.
- Tests: `tests/unit/playground.test.ts`, `tests/e2e/playground.spec.ts` (keys, pad,
  undo/redo, solving a real worker scramble, 2x2).

## What it is

A virtual puzzle sandbox at `/playground`: a 3D puzzle on screen that you can turn
with the keyboard, mouse or touch, scramble, solve, undo, and optionally time. No
account needed, no physical cube needed.

Why it belongs in CubeHub:

- **Beginners without a cube** (or before their first one arrives from the Shop
  tab) can still follow the Learn tutorials.
- **Learners** can try an algorithm from a Learn card on a live cube instead of
  only watching the player, and experiment with what a move does.
- **Groundwork for Compete.** Virtual-cube races and bot "ghosts" need exactly
  this: a move-by-move puzzle state you can replay. Building it now as a
  self-contained page de-risks Phase 5.

It is *not* a replacement for the timer. Virtual times and physical times are
different skills, and must never mix in stats, PBs or leaderboards.

## Puzzles to start with

| Puzzle | Start? | Why |
|---|---|---|
| **3x3** | **Yes — MVP** | The main puzzle. Scrambler, 3D viewer and the Learn content (OLL/PLL/beginner) already exist. The csTimer keyboard layout is a de-facto standard cubers already know. |
| **2x2** | **Yes — MVP** | Already supported by the timer scrambler and the Learn tab (beginner, Ortega). Same move notation as 3x3, so the input layer is shared for free. |
| Pyraminx | Phase 3 | Popular with Indian beginners and cheap to buy, so fits the Shop tab. cubing.js renders and scrambles it, but it needs its own key map (R L U B + tips) and a new `TimerPuzzle` value. |
| Skewb | Phase 3 | Same reasoning as Pyraminx; four-axis notation means another key map. |
| 4x4 | Phase 3 | Same notation family as 3x3 plus wide moves (`Rw`, `Uw`…); main cost is a bigger key map and the parity explanation in Learn. |
| Megaminx, Square-1, Clock, 5x5+ | Later / maybe never | Rendering works in cubing.js, but input is the hard part (Square-1 slices, Clock pins, 12 Megaminx faces). Low usage relative to effort. |

The DB `puzzle_type` enum already contains every one of these, so adding a puzzle
later is code-only. The timer's `TimerPuzzle` type (`"333" | "222"`) is the thing
that widens.

## Features by phase

### Phase 1 — MVP (3x3, 2x2)

- **Live 3D puzzle** using the existing `loadTwisty()` runtime loader. No new dependency.
- **Inputs**
  - Keyboard: csTimer-compatible layout (I/K = R/R', D/E = L/L', J/F = U/U',
    H/G = F/F', S/L = D/D', W/O = B/B', ;/A = y/y', T/B = x/x', P/Q = z/z').
    Verify each key against csTimer before shipping; muscle memory is the point.
  - Mouse / touch: drag to rotate the view; click or swipe on a face to turn it
    (cubing.js has experimental move-press input on the 3D view, see feasibility).
  - On-screen move pad (R R' U U' …) for phones, where there is no keyboard and
    swipe-to-turn is fiddly.
- **Scramble** button using the existing `generateScramble()` (WCA random-state).
- **Reset**, **Undo / Redo**, **move counter**, **move history** (the alg so far,
  copyable).
- **Solved detection** — "Solved in 42 moves" with a small celebration.
- 3D / 2D toggle, and whole-cube rotation buttons (x, y, z).
- Works logged out, nothing written to Supabase.

### Phase 2 — connect it to the rest of the site

- **"Try it" from Learn**: a button on each algorithm card that opens
  `/playground?puzzle=333&setup=<inverse of alg>` so the cube starts on that case.
  The Drill Lab already derives a case from the inverse of its algorithm
  (`lib/drill/case-state.ts`), so this reuses that idea.
- **Shareable state**: the URL carries `puzzle`, `setup` and `alg`, so a link
  reproduces the exact cube (good for asking for help in WhatsApp groups / Discord).
- **Virtual solve mode**: scramble → optional 15s inspection → timer starts on
  the first turn → stops on solved. Shows time, move count, TPS.
- **Solve replay**: every move is stored with a timestamp, so a finished solve can
  be replayed at real speed in the same player.
- ~~Virtual solve history in localStorage~~: dropped. Solves are not stored.

### Phase 3 — more puzzles and smart cubes

- Pyraminx, Skewb, 4x4 (each = key map + puzzle id mapping + scramble event).
- **Bluetooth smart cubes** (GAN, GoCube, Giiker…) via `cubing/bluetooth`. Turn
  the real cube, the virtual one follows. Also unlocks automatic move recording in
  the real timer later.

### Later — feeds Phase 5 (Compete)

- Virtual-cube races on the same scramble (equal input method for both players).
- Bots as replayed "ghost" solves at a target time.
- Daily scramble challenge with a fewest-moves leaderboard.

## Feasibility

| Feature | Effort | Risk | Notes |
|---|---|---|---|
| 3D cube + keyboard input | Low | Low | `TwistyPlayer` is already loaded by `alg-player-inner.tsx`; appending moves (`experimentalAddMove`) is how cubing.js's own demos do live input. |
| Click / swipe to turn on 3D | Low–Med | **Medium** | Relies on an *experimental* cubing.js option; behaviour on touch screens must be tested on real phones. The move pad is the fallback, which is why it is in the MVP. |
| Scramble | Trivial | Low | `generateScramble()` exists and runs in the worker. |
| Undo / redo / history | Low | Low | Keep our own move list as the source of truth and rebuild the player's alg from it; don't read state back out of the web component. |
| Solved detection | Low–Med | Low | Use `cubing/puzzles` → `kpuzzle`, apply the move list to the solved pattern and compare **ignoring whole-puzzle orientation** (otherwise a solved cube after a `y` reads as unsolved). Unit-testable without a browser. |
| Learn "Try it" + share links | Low | Low | URL params only. Validate/parse `alg` with `cubing/alg` and reject garbage. |
| Virtual solve timer + replay | Medium | Low | Must not import `useTimerStore` / `useSessionStore` (same rule as the landing demo in `architecture.md`); own store. |
| Pyraminx / Skewb / 4x4 | Medium each | Low–Med | Mostly key maps + tests. |
| Smart cubes (Bluetooth) | Med–High | **High** | Web Bluetooth works in Chrome/Edge on desktop and Android only — **not iOS Safari**, and many Indian users are on Android, so still worthwhile. Needs `bluetooth/index` added to `scripts/build-cubing.mjs` `ENTRIES` and a `loadBluetooth` in `runtime.ts`. Hardware to test against is required. |
| Races / bots | High | High | Phase 5 work; depends on Realtime and ELO. |

**Overall: Phases 1–2 are very feasible** for a solo developer. Everything they need
(cubing.js runtime, scrambler, 3D player, theme tokens, route groups) is already in
the codebase, and they need **no migration**.

## Technical shape

```
src/app/(app)/playground/page.tsx        route (server component shell)
src/components/playground/
  playground-screen.tsx                  client container
  playground-cube.tsx                    TwistyPlayer wrapper (lazy, like alg-player-inner)
  move-pad.tsx                           on-screen buttons for mobile
  move-history.tsx
src/lib/playground/
  keymap.ts                              key → move, per puzzle (pure, unit-tested)
  moves.ts                               move list, undo/redo, invert, to-alg string
  solved.ts                              kpuzzle-based solved check
src/stores/playground-store.ts           zustand, independent of the timer stores
tests/unit/playground-*.test.ts
tests/e2e/playground.spec.ts             type keys → move count; scramble + inverse → "Solved"
```

Rules to keep:

- **No value imports from `cubing/*`** — load through `src/lib/cubing/runtime.ts`
  only (see the comment at the top of that file).
- **Theme tokens only**; `npm run check:colors` will fail on hardcoded colours.
  Sticker colours already come from `src/lib/stickers.ts`.
- **Keyboard scope**: the page owns its key handler and ignores keys while focus is
  in an input. Space must not be bound (it is the timer's key everywhere else, and
  the drill uses it too).
- Page is fully usable before the cube loads — show the existing `CubeLoader`.

### Navigation

The desktop navbar can take a "Playground" link. The **mobile bottom bar is
already full at five tabs** (`MOBILE_HIDDEN` in `src/lib/navigation.ts`), so on
mobile Playground should be reached from the Learn page and from "Try it" buttons
rather than getting its own tab. Revisit if usage justifies swapping a tab.

### Data

**Decided: none, in any phase.** Playground solves are never stored. If that ever
changes, use a separate `virtual_solves` table; never insert them into `solves`,
whose PB triggers and leaderboards assume physical solves.

## Suggested order of work

1. `lib/playground/` pure logic (keymap, move list, solved check) + unit tests.
2. `/playground` page with the 3D cube, keyboard input, scramble, reset, undo.
3. Move pad + touch testing on a real Android phone.
4. Navbar link, Learn page entry point, e2e test.
5. Phase 2: "Try it" buttons, share links, virtual solve mode, replay.
6. Phase 3 puzzles, then smart-cube spike.

## Open questions — answered (2026-10-06)

1. Playground is the virtual cube sandbox described here. **Yes.**
2. Store virtual solves? **No, never.**
3. No phone bottom-bar tab: kept as planned; Learn links to it.
4. Bluetooth smart cube to test with? **Not yet**, so smart-cube support waits.
