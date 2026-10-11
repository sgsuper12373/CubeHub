# Timer page: final feature round (branch `timer-page`)

## Context
The founder wants to close the timer page to further changes unless users ask for them.
From the brainstorm, 7 features were chosen for this round. Items 8–10 are deferred:
training scrambles go to the Drill Lab, smart cube support waits for demand, PWA is site-wide.
Stackmat support is also deferred until users ask.

Decisions:
- **Events:** popular events only, picked from a dropdown: 3x3, 2x2, 4x4, 5x5, 3x3 OH,
  Pyraminx, Skewb, Megaminx.
- **Mo3:** shown on every event, alongside Ao5/Ao12. Ao5 stays the headline average, because
  none of the chosen events uses mo3 as its WCA format.
- **PB toasts:** "Session best" for the current session, and a full celebration with a share
  image for an all-time best.

Everything is built on `timer-page`, one commit per step, and merged when done.

## Step 0: `docs/timer.md` (written first)
- **Existing features**, grouped as: timing, inspection, scrambles and preview, sessions,
  penalties and shortcuts, stats, modes (Zen, Focus, Blind, Fullscreen, WCA), layout and
  background, data (export, csTimer import, sync).
- **This round:** the 7 items below, as a checklist that's ticked as they ship.
- **Later (on user request):** Stackmat timer, smart cubes (GAN Bluetooth), installable app
  and offline (PWA), more events (6x6, 7x7, Square-1, Clock, BLD, Multi-BLD).
- **Moved to Drill Lab:** training scrambles (cross, F2L, last layer).
- Add a link to `docs/timer.md` from `docs/roadmap.md`.

## Step 1: Event dropdown and Mo3
- **New `src/lib/timer/events.ts`**: a single registry used everywhere.
  - Each event has an `id` (the DB `puzzle_type`), `label`, `shortLabel`, cubing.js event id
    (`mega`→`minx`, `pyra`→`pyram`; the others are the same) and twisty puzzle id.
  - `TimerPuzzle` in `types.ts` becomes the union of the 8 ids. All 8 are valid DB enum values.
- **`scrambler.ts`**: map to the cubing event id. Today it passes ours straight through,
  which would break Megaminx and Pyraminx.
- **`session-switcher.tsx`**: the 3×3/2×2 button group becomes a themed `<select>`, styled
  like the existing session select.
- **Remember the last event:** a client-only `cubehub.timer.event` key in localStorage. It's
  read in `session-store` hydrate and `timer-store` init. Today the page always opens on 3x3,
  which is bad with 8 events.
- **Replace the 3x3/2x2-only label code with the registry:**
  - `scramble-preview-inner.tsx` (reuse its existing map)
  - `scramble-bar.tsx` aria label
  - `stats-screen.tsx` PUZZLES (the `/stats` puzzle picker)
  - `profile/[username]/page.tsx` label helper
  - `export.ts` filename
  - `import-cstimer.ts`: `SUPPORTED_PUZZLES` plus csTimer `scrType` mapping for 444/555/pyra/skewb/mega.
    OH can't be told apart from 333 in csTimer files, so it imports as 333 (documented).
- **Mo3:**
  - `stats.ts`: `meanOfN(solves, 3)`. Any DNF makes it DNF; rounded to centiseconds like `wcaAverage`.
  - `bestAverageOfN` gets a mean variant for local PBs.
  - Add the Mo3 row to `session-stats.tsx`, `stat-tiles.tsx`/`stats-panel.tsx` and `pb-row.tsx`.
  - `PbCategory` gains `"mean3"`, so `repo-supabase.ts` stops filtering it out.
  - `repo-local.ts` computes `mean3`.
- **Migration `supabase/migrations/2026101100000_timer_round.sql`** (applied by hand on the dashboard):
  - Add `mean3` to `best_average_of_n`, `recompute_average_pbs` and `ratchet_average_pbs_for_solve`.
    It needs an `is_mean` branch: a plain mean, and any DNF means no candidate.
    Then run `recompute_all_pbs` once for existing users.
  - Add `'manual'` to the `solves.source` check (for Step 4).
  - Fold in the pending security fix: fixed `search_path` on `is_admin()`, and revoke `EXECUTE`
    from public, anon and authenticated on the three PB trigger functions.

## Step 2: Session best vs all-time PB, celebration and share image
- **`session-store`**: load `allTimeBests` with `repo.loadPersonalBests(puzzle)` alongside
  sessions in `loadPuzzle()`. After each solve, update the in-memory copy (the DB triggers keep
  the cloud copy correct).
- **New pure helper `src/lib/timer/pb-detect.ts`**: `detectRecords(prevSolves, nextSolves, allTimeBests)`.
  - Returns improvements for `single`, `mean3`, `ao5` and `ao12`, each tagged `session` or `allTime`.
  - All-time fires only if a previous all-time value existed, so a first-ever solve doesn't count.
  - Session best needs at least one earlier value in the session.
  - It replaces the inline block in `timer-screen.tsx` (lines ~139–176).
- **Notifications:**
  - Session best: the existing toast with new text, e.g. "Session best single: 10.23".
  - All-time: a new `PbCelebration` dialog with confetti (`canvas-confetti`, about 6 KB,
    loaded on demand; skipped under `prefers-reduced-motion`) and the existing `celebrate`
    pulse on the digits.
  - The dialog shows the event, category, time, the previous PB and the improvement, with
    **Share** and **Close** buttons. It must not open mid-inspection and must not swallow
    Space for the next solve.
- **New `src/lib/timer/share-card.ts`**: draws the PB card on a canvas, 1080×1350 (Instagram portrait).
  - The card shows the CubeHub wordmark, event, category, time, previous PB, date, and the
    solve times for an average.
  - Colours come from the theme tokens, read with `getComputedStyle`.
  - **Share** uses `navigator.share({ files })` where it's supported (Android and iOS share
    sheets, including WhatsApp). Otherwise it downloads the PNG and copies it to the clipboard.

## Step 3: Copy an average as text
- **New `formatAverageText()` in `src/lib/timer/share-text.ts`**, in csTimer style:
  `Ao5: 12.34 = 11.20, (10.90), 13.10, (DNF), 12.70` plus numbered scrambles, with the event
  and date on top. Trimmed solves are shown in brackets.
- **Clicking the Mo3/Ao5/Ao12 rows** in `session-stats.tsx` and the mobile `stats-panel.tsx`
  copies the text, with a "Copied" toast.
- **The PB celebration also gets a "Copy text" button.**

## Step 4: Manual entry
- **New setting `inputMode: "timer" | "typing"`**: client-only in `settings-persistence.ts`,
  with a toggle in `quick-settings.tsx` ("Enter times by: Timer / Typing").
- **New `src/lib/timer/parse-time.ts`** reads typed times the way csTimer does:
  - `12.34`, `1:02.34`
  - digits only: `1234` → 12.34, `10234` → 1:02.34
  - suffix `+` → +2; `DNF` or `DNF(12.34)` → DNF
  - rejects zero and anything over 24h
- **New `typing-entry.tsx`** replaces `TouchStage` while typing mode is on:
  - an autofocused input; Enter saves the solve with the current scramble and advances it
  - an inline error for unparseable input
  - the D/1/2 shortcuts are disabled while the input has focus
- **Saved solves carry `source: 'manual'`**: an optional `source` field on `Solve`, mapped in
  `repo-supabase.ts`. Later leaderboards can then exclude typed times.

## Step 5: Previous and custom scramble
- **`timer-store`**: a `prev` scramble slot, filled by `advanceScramble` and `skipScramble`.
  - New `previousScramble()` swaps back, but only when idle.
  - New `setCustomScramble(alg)`.
  - New `scramble.kind: "random" | "custom"`.
- **`scramble-bar.tsx`**: a "Previous" button, and an "Enter scramble" button that opens a
  small dialog.
  - Paste, then trim, collapse whitespace and cap at 500 characters.
  - For cube events, validate by parsing with cubing's `Alg` (`loadAlg`).
- **Custom scrambles are saved with `scramble_type: 'custom'`**: an optional `scrambleType` on
  `Solve`, mapped in the repo.
- **Shortcut:** `←` = previous scramble while idle (`→` stays "next" if it already exists;
  otherwise it's added). Listed in `shortcuts-overlay.tsx`.

## Step 6: Recently deleted
- **Repo:**
  - `loadDeletedSolves(puzzle, limit = 100)`: newest deleted first, last 30 days. In Supabase,
    `.not("deleted_at","is",null)`; local filters on `deletedAt`.
  - `purgeSolves(ids)` hard-deletes. RLS `solves_all` already lets the owner delete, and the
    delete trigger recomputes PBs.
- **New `recently-deleted.tsx` dialog**, opened from a trash-clock button in the session switcher:
  - Lists the time, session name, and when it was deleted.
  - Per row: Restore (reusing `restoreSolves`) and Delete forever (with a confirm).
  - "Restore all".
- **Deferred:** an automatic purge job (logged in `docs/timer.md`).

## Step 7: Inspection beeps
- **Setting `inspectionAlert: "voice" | "beep" | "off"`** replaces `voiceEnabled`.
  `loadClientSettings` migrates the old boolean: true → voice, false → off.
- **New `src/lib/timer/beep.ts`**: a WebAudio oscillator.
  - Short beep at 8s, double beep at 12s.
  - At 15s and 17s, the same thresholds `voice.ts` already uses.
  - Created lazily on first user gesture, for iOS autoplay rules.
- **`time-display.tsx`** (around line 87) picks voice or beep.
- **`quick-settings.tsx`**: the voice toggle becomes a 3-way segmented control.

## Reuse
- `wcaAverage` and `bestAverageOfN` (`stats.ts`), `formatMs`/`formatAverage` (`format.ts`)
- `toast` and `confirm` stores, `SegmentedControl`/`SettingRow` (`quick-settings.tsx`)
- `restoreSolves`, `loadPersonalBests`, `loadAlg`/`loadScramble` (`lib/cubing/runtime.ts`)
- The twisty map in `scramble-preview-inner.tsx`

## Verification
- **Unit tests (vitest):**
  - `events` registry and cubing id mapping
  - `meanOfN` and DNF rules, and local mean3 PBs
  - `detectRecords`: session vs all-time, first solve, DNF, penalty
  - `parse-time` (each input form above)
  - `formatAverageText`
  - scramble prev/custom state transitions
  - settings migration from `voiceEnabled`
  - csTimer import of 444/pyra
- **E2E (Playwright, in `tests/e2e/timer.spec.ts`):**
  - Switch to Pyraminx: a scramble appears, and the event survives a reload.
  - Typing mode: enter `1234` and the list shows 12.34.
  - Previous scramble restores the earlier one.
  - Delete a solve, then restore it from Recently deleted.
  - Copy Ao5 puts the expected text on the clipboard.
- **By hand on `next dev`:** each event's 2D and 3D preview; the PB dialog and share image on
  desktop and at 390px; beeps.
- **Each step:** `npm run validate`, `check:colors`, `npm run build`.
- **Migration:** run against the local Supabase (podman) from the Drill Lab work. Check mo3 PBs
  with a scripted insert, soft-delete and DNF test. The founder then applies it on the dashboard.
- **Log:** append to `implementationlog.md` each step, and tick `docs/timer.md`.
