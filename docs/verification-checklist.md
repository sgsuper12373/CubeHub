# Verification checklist: what shipped on 2026-11-26

Tick what works and write anything to change under **Notes**, then tell Claude to read it. The
previous pass (2026-11-25), as you filled it in, is in git (`c022eba`). Things that are always
yours (Vercel, Supabase, decisions) stay in `founder-checklist.md`.

**Where to check**

- **A and B are live** on https://www.cuberhub.me after the push on 2026-11-26.
- **C (Cubby) is off on the live site.** Check it locally: `NEXT_PUBLIC_SHOW_CUBBY=1 npm run dev`,
  started with the flag (restart the dev server if it was already running without it). Use a
  private window so every tour starts fresh.

---

## A. Left over from the last pass

- [ ] **Offline, other pages:** open `/timer` once, then DevTools → Network → **Offline** (not
      Wi-Fi off: `localhost` still answers then). Open `/stats`: a "You're offline" page with
      "Open the timer".
- [ ] **Home usage events:** Vercel → your project → Analytics → **Events** (switch Web Analytics
      on if it's off). Click a few Home cards, change something in Customize, and finish a
      daily. Within a few minutes you see `home_card_click`, `home_customize` and `daily_attempt`.

**Notes:**

---

## B. 3x3 BLD (live)

- [ ] **The event:** the event menu on `/timer` has **3x3 BLD**. It has its own sessions, and its
      times don't appear in your 3x3 stats.
- [ ] **No inspection:** with WCA inspection on, holding Space in 3x3 BLD goes straight to
      "release to start" (no 15-second countdown). 3x3 still has inspection.
- [ ] **Without the memo split:** one key press stops the solve.
- [ ] **With the memo split:** Timer settings (gear) → **BLD memo split** on. Start a solve:
  - [ ] The hint under the time says "memo · press any key when the blindfold goes on".
  - [ ] Press a key: the clock keeps going and the hint says "solving · press any key to stop".
  - [ ] Press again: the solve stops.
  - [ ] Click the solve in the list: the details show "Memo 23.41 · Execution 41.12" style times.
- [ ] **Saved to your account:** signed in, do a split solve, then reload (or open it on another
      device): the memo time is still in the solve details.
- [ ] **On a phone:** taps work like key presses (tap to end memo, tap to stop).
- [ ] **Profile:** "my cube for each event" in Edit profile includes 3x3 BLD.

**Notes:**

---

## C. Cubby (local, with the flag)

### C1. The dock

- [ ] **Desktop:** Cubby sits at the bottom of the sidebar, with its name. In the collapsed rail,
      just the avatar. With the sidebar hidden, a floating Cubby bottom-left.
- [ ] **Phone:** a floating Cubby above the tab bar, bottom-right.
- [ ] **Menu:** Tour this page, Give me a tip, Mute Cubby, Settings…. `?` opens it too, except on
      the Timer and Playground (their `?` lists shortcuts).
- [ ] **Hidden while solving** when "Hide UI while solving" is on.

### C2. Tours (first visit to each page)

- [ ] **Timer** (8 steps), starting about a second after the page loads:
  - [ ] "Pick your puzzle" waits until you change the event.
  - [ ] "Time a solve" waits for a real solve, and the card hides while the clock runs.
  - [ ] The next step points at +2 / DNF / delete.
- [ ] **Learn** `/learn` (4 steps) and **a set** `/learn/333/pll` (5 steps; the last waits for
      you to open a case).
- [ ] **Drill Lab** `/learn/333/drill` (6 steps; "Time a case" waits for a rep).
- [ ] **Playground** (5 steps; the first two wait for you to turn the view and turn a layer).
- [ ] **Keyboard:** → and Enter go forward, ← back, Esc skips. Space does nothing behind a normal
      step.
- [ ] **Skip:** after Esc, the dock shows a small dot once. Opening the menu clears it, and the
      tour doesn't start again by itself. "Tour this page" replays it.
- [ ] **Placement:** the card never covers the time or the scramble.
- [ ] **Wording:** read every step. Anything wrong, unclear, or not how the page works? (Notes.)

### C3. Greetings and reactions

- [ ] **Greeting:** back on a page whose tour you've had (more than 10 minutes later), a one-line
      bubble beside the dock, typed out, gone after about 4 seconds. At most one per page per tab
      session, and never while the timer runs.
- [ ] **PB:** a new all-time PB → Cubby celebrates and says "New single PB! 12.84, 0.60 off your
      old one."
- [ ] **+2 / DNF:** a small wince, no words.
- [ ] **Mis-stop:** a very fast stop → Cubby explains "It was real".
- [ ] **Mark a case learned** on a Learn card → thumbs up and a line.
- [ ] **Playground:** solve a scrambled cube → a cheer.

### C4. 3x3 BLD with Cubby

- [ ] During a 3x3 BLD solve, Cubby appears in the bottom-right corner holding a small cube
      (memo, with letter pairs drifting by), then puts a blindfold on (at the memo split, or after
      about 2.5 s without it) and turns the cube.
- [ ] At the stop the blindfold comes off and Cubby cheers. Mark the solve DNF straight away and
      you get a shrug and "BLD is brutal. Next one." instead.
- [ ] Settings → "BLD solving animation" off: no Cubby during BLD.

### C5. Settings

- [ ] **Dock → Settings…** opens a panel: Companion (On / Quiet / Off), Name, Tours on first visit,
      Reactions, BLD solving animation, Motion, Reset tours.
- [ ] **Rename** to anything: the tours, greetings and the dock use the new name.
- [ ] **Quiet:** no tours or greetings by themselves; "Tour this page" still works.
- [ ] **Off:** Cubby disappears everywhere. **Ctrl+K → "Cubby settings"** brings the panel back.
- [ ] **Signed in:** `/settings` has a Cubby section. Change something, then sign in on another
      browser: the same settings, and the tours you've already seen don't start again.
- [ ] **Reduced motion** (Motion → Reduced, or your system setting): Cubby holds still poses and
      lines appear without typing.

### C6. Elsewhere

- [ ] **Home:** Cubby's face on the tip card instead of the CH mark.
- [ ] **Landing page:** "Meet Cubby, your practice buddy." after the feature chapters, with three
      Cubbys; the waving one's eyes follow your pointer.
- [ ] **`/dev/cubby`:** every expression and pose, in Slate and in Paper. **Is the v0 art good
      enough for the beta?** (Notes.)

**Notes:**

---

## Known and not a bug

- **The e2e clubs posting test** fails after a few runs in a day: the test account hits the live
  limit of 10 posts a day. It resets daily.
- **"The destination stream closed early"** in server logs: a page closed mid-load. Harmless.
- **"Encountered a script tag"** in the dev console: the theme script in the root layout, which
  runs from the server HTML before React loads. Dev-only and harmless.
- **A hydration error in the sidebar** right after turning the Cubby flag on in a running dev
  server: restart `next dev` with the flag set from the start.
