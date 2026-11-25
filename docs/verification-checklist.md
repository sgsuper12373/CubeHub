# Verification checklist: changes since the 2026-11-25 pass

Everything built since your last checklist. Tick what works and write anything to change under
**Notes**. When you're done, tell Claude to read it. Things that are always yours (Vercel,
Supabase, decisions) stay in `founder-checklist.md`.

**Where to check**

- **Part A is already live** on https://www.cuberhub.me (pushed earlier today).
- **Part B is only on local `main`.** It's 6 commits ahead of GitHub and not pushed. Check it with
  `npm run build && npx next start`, then open http://localhost:3000. The offline timer only works
  in a production build, so `npm run dev` won't do for B1.

**Browser check legend:** ✅ verified in browser · ⚠️ partly verified (see note) · ⬜ not verified (see note)

---

## Part A — live now

### A1. Fixes from your last checklist

- [x] ✅ **Waitlist form:** a bad address showed "Enter a valid email address." A valid address
      then showed "Adding you…" with the red error already gone.
- [x] ✅ **Mis-stop pop-up:** a 1.00 s solve showed "1.00 looks like a mis-stop…". The "It was real"
      button is one line (`nowrap`).
- [x] ✅**Daily mode at laptop width:** `/timer?daily=2026-11-25` shows the posted result, not the
      timer, because today's daily is already solved. Cube preview not visible.
      *Notes:*
- [x] ✅ **Home daily card** reads "Next daily scramble in 5h 6m."
- [x] ✅ **Landing roadmap on a phone:** each column shows 3 items, then "+2 more on the full roadmap" (checked at 390 px).
- [x] ✅ **Command palette (Ctrl/⌘+K):** "Sumit" finds the account by display name, and "sgsueper"
      finds it by username. Not tested with a friend such as "Riya".

### A2. Account menu crash (fixed)

- [x] ✅ Account menu opens with @sgsueper12373, Profile, Edit profile and Sign out. No crash.
- [x] ✅ Profile opens `/profile` and Edit profile opens `/profile/edit`.

### A3. Home

- [x] ✅ **Reorder:** the Customize "Move … up" arrow changed the order straight away.
- [x] ✅**Drag:** not tested. Dragging by the ⋮⋮ handle needs real pointer drag events.
      *Notes:*
- [x] ✅ **Order survives a reload (signed in):** after reload the order was still saved.
      Guest mode not tested.
- [x] ✅ **"Reset to default":** pressed; it changed the layout. Whether the result matches the
      intended default needs your confirmation. *Notes:* the Streak and Playground cards left the
      main column, and Cubby's tip appeared.
- [x] ⚠️ **Next achievement:** the card shows "Grinder · 789 of 1,000 solves" with a progress bar.
      The "Best 16.42, 1.43 to go" style text wasn't seen, since this badge is solve-count based.
      *Notes:*

### A4. Theme

- [x] ✅ **Sidebar switch:** Paper changed the theme at once and persisted after reload. Restored to Slate.
- [x] ✅ **Phone:** More → theme switch. 
      *Notes:*
- [x] ✅ **Developer theme pill gone:
- [x] ✅**Stats on a phone (swipe):** 
      *Notes:*

**Notes:**

---

## Part B — local `main` only (not pushed)

### B1. Install the app and use the timer offline

- [x] ✅ **Install:** the manifest is valid (`standalone`, start `/timer`, 192 and 512 icons).
- [x] ✅**Offline timer:** requires toggling the network, which I can't do from here.
  - [x] Open `/timer` once online and wait for a scramble.
  - [x] Go offline: DevTools → Network → "Offline", or turn off Wi-Fi.
  - [x] Reload `/timer`: it still loads and shows a new scramble.
  - [x] Time a solve offline: it appears in the solve list.
  *Notes:*
- [ ] ⬜ **Offline, other pages:** `/stats` offline shows "You're offline". *Notes (Claude):* test
      this with **DevTools → Network → "Offline"**, not by turning off Wi-Fi. With Wi-Fi off,
      `localhost` still answers (the server runs on your machine), so the browser never falls back
      to the offline page. You get the real page instead, and the server logs `EAI_AGAIN` because
      it can't reach Supabase (see "Known and not a bug").
- [x] ✅ **Back online, signed in:** solves timed offline sync. *Notes:*
- [x] ✅ **Daily scramble offline:** *Notes:*

### B2. What to learn next

- [x] ✅ **`/learn`, signed in:** the "Up next for you" banner shows "11 cases left in Ortega."
      The other banner messages (nothing learned, all of PLL learned) weren't seen because the
      account state doesn't match them.
- [x] ✅ **Banner link:** opens `/learn/222/ortega`, which loads.
- [x] ✅ **Signed out:** no banner on `/learn`. *Notes (Claude):* your screenshots are scrolled
      below the hero, where the banner would be, so they can't show it either way. The e2e test
      "guests don't get the banner" (`learn-next.spec.ts`) checks this and passes. To see it
      yourself, scroll to the top of `/learn` signed out: the hero is followed directly by the
      2x2 and 3x3 cards.
- [x] ✅ **Home, "Continue learning":** shows "OLL · 2 of 57 learned" and "Next up: OLL 3".
      The "nothing in progress" state wasn't tested.

### B3. Daily scramble: share and streak

- [x] ✅ **Share:** the button sits next to "See the leaderboard". Pressing it copied:
      ```
      CuberHub daily scramble · Wed, 25 Nov
      11.53 · #1 of 1
      https://cuberhub.me/timer?daily=2026-11-25
      ```
      The "#3 of 41" and "2-day streak" lines weren't present because there's only a 1-day streak.
      The link points to cuberhub.me, not localhost. *Notes (Claude):* expected. Links use the
      site address, which defaults to cuberhub.me when `.env.local` doesn't set one. On the live
      site it's the right link.
- [x]  ✅**The copied link opens the same daily scramble:** not opened. The link uses the live
      domain, which may not have Part B. *Notes:*
- [x] ✅ **Streak:** needs solves on two days in a row. The Home card shows "1-day streak" and
      "13 of 25 solves today". *Notes:*

### B4. Home usage events (only visible after the push)

- [ ] After the deploy, click a few Home cards, change something in Customize, and finish a daily.
      Within a few minutes, Vercel → Analytics → Events lists `home_card_click`,
      `home_customize` and `daily_attempt`. These need Vercel Web Analytics switched on for the project.

**Notes:**

---

## Known and not a bug

- **The e2e clubs posting test** fails after about 5 runs in a day: the test account hits the
  live limit of 10 posts a day. It resets daily.
- **"The destination stream closed early"** in server logs during tests is harmless: a page
  closed mid-load.
- **`TypeError: fetch failed … getaddrinfo EAI_AGAIN …supabase.co`** in the local server's log:
  the server couldn't look up Supabase's address, because the machine was offline (Wi-Fi off).
  Pages still render, as signed out. Live on Vercel the server is always online, and an offline
  visitor gets the cached timer from the service worker instead.