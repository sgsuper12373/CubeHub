# Timer

The timer is the heart of CubeHub: it should be usable within seconds of landing, on a phone or
a keyboard. This page lists what the timer does today and what is planned.

**Status:** one last feature round is in progress on branch `timer-page` (plan below). After it
ships, the timer page is closed to new features. Changes after that happen only when users ask.

Related: `/stats` analytics are covered in `roadmap.md` → Phase 2, and the Drill Lab in
`roadmap.md` → Phase 3.

---

## Existing features

### Timing
- Accurate `performance.now()` timing, using a phase machine: idle → holding → ready → running → stopped.
- Start by holding Space, or holding a finger on the screen, then releasing. Stop with any key or a tap.
- Adjustable hold-to-start time (150–550 ms).
- Display precision of 2 or 3 decimals, and an adjustable timer font size.
- An option to ignore mouse clicks, so a stray click can't start the timer (touch still works).

### Inspection
- Off, 8s or 15s (WCA).
- An automatic +2 after 15s and DNF after 17s, as in WCA rules.
- Spoken callouts at 8s and 12s.

### Scrambles and preview
- WCA random-state scrambles from cubing.js, generated in a worker. The next scramble is
  prepared in advance, so a new one is instant.
- New scramble and copy scramble buttons.
- Scramble preview as a 2D net or a 3D cube.

### Puzzles and sessions
- 3x3 and 2x2.
- Named sessions per puzzle: create, rename, switch, clear and delete.
- Clearing a session and deleting a solve are soft deletes, with an Undo toast that still
  works after a reload.
- Destructive actions ask for confirmation first.

### Penalties and shortcuts
- After a solve, a +2 / DNF / delete bar. Penalties can be changed on any solve in the list.
- Keyboard: `Space` start/stop, any key for a panic stop, `Esc` cancel, `D` delete last,
  `1` toggle +2, `2` toggle DNF, `?` shortcuts list.

### Stats (on the timer page)
- Best, mean, Ao5, Ao12, Ao50 and Ao100 (WCA trimmed averages).
- A trend sparkline with the Ao5 change.
- A solve list with notes, penalties and per-solve details (including copy scramble).
- On mobile, a stats drawer.
- A "New PB" toast and a glow on the digits. ⚠️ This currently compares within the session
  only; it is fixed in this round (item 2).

### Modes
- **Zen:** everything but the digits dims while solving.
- **Focus:** everything but the digits is hidden while solving, including the navigation.
- **Blind:** the time is hidden while running.
- **Fullscreen.**
- **WCA / competition:** 15s inspection.

### Layout and look
- A panel grid (scramble, timer, preview, stats, trend, solves) that can be dragged and resized.
- A custom background image, with opacity, blur, brightness, fit and position.
- Theme-aware (Slate, Paper, System).

### Data
- Works signed out (localStorage). Local solves sync to the account on sign-in.
- All-time personal bests are kept by database triggers. They heal on delete and penalty change.
- Export as CSV or JSON, and import from csTimer or a CubeHub JSON backup (on `/stats`).

---

## This round (branch `timer-page`)

The full plan is in [`timer-plan.md`](timer-plan.md). Tick each item as it ships.

- [ ] **1. More events.** A dropdown with 3x3, 2x2, 4x4, 5x5, 3x3 OH, Pyraminx, Skewb and
      Megaminx. The last event is remembered.
  - **Mo3** is added to the stats for every event (Ao5 stays the headline average).
  - **Mo3 personal bests** in the database. The same migration also carries the pending
    security fix (`is_admin()` search_path, and trigger-function `EXECUTE` revokes).
- [ ] **2. PB notifications and celebration.**
  - "Session best" toast for the current session.
  - "All-time PB" celebration, with confetti and a share image (a 1080×1350 PNG, shared
    through the phone's share sheet or downloaded).
  - Covers single, Mo3, Ao5 and Ao12.
- [ ] **3. Copy an average as text.** csTimer-style text (`Ao5: 12.34 = 11.20, (10.90), …`
      with scrambles), ready to paste into WhatsApp or Instagram.
- [ ] **4. Manual time entry.** A "Typing" input mode that reads `12.34`, `1:02.34`, `1234`,
      `12.34+` and `DNF`. Typed solves are saved with `source = 'manual'`.
- [ ] **5. Previous scramble and custom scramble.** Go back one scramble (`←`), or paste
      your own. Custom scrambles are saved with `scramble_type = 'custom'`.
- [ ] **6. Recently deleted.** Restore or permanently delete soft-deleted solves from the
      last 30 days.
- [ ] **7. Inspection beeps.** The inspection alert can be voice, beep or off.

---

## Later: only on user request

- **Stackmat timer support.** Connect a real competition timer through the audio input.
- **Smart cubes** (GAN and similar, over Bluetooth). Exact timing and move recording.
  Chrome and Android only, and most cubers don't own one yet. Revisit if the smart-cube user
  base grows.
- **Installable app and offline timer (PWA).** A manifest and service worker. This is
  site-wide work rather than timer work, and it's on the Phase 6 list in `roadmap.md`.
- **More events:** 6x6, 7x7, Square-1, Clock, 3BLD, 4BLD, 5BLD (mo3 as the headline average),
  and Multi-BLD (needs its own result format: cubes solved and attempted).
- **Automatic purge** of soft-deleted solves older than 30 days.
- **Remember the event across devices** (`user_settings.default_puzzle`) instead of only on
  this device.

## Moved elsewhere

- **Training scrambles** (cross-only, F2L, last layer) belong in the Drill Lab, not the timer.
